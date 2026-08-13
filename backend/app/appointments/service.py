import uuid
import logging
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Optional, cast
from fastapi import HTTPException, status
from sqlalchemy import text

from app.core.database import supabase, local_engine
from app.notifications.service import broadcast_notification
from app.appointments.constants import (
    AppointmentStatus,
    ConsultationMode,
    CancelledBy,
    TelemedStatus,
    STATUS_TRANSITIONS,
)
from app.appointments.exceptions import SlotConflictError, InvalidTransitionError
from app.appointments.schemas import (
    AppointmentBookRequest,
    AppointmentRescheduleRequest,
    AppointmentCancelRequest,
    AppointmentResponse,
    AuditLogResponse,
)
from app.appointments.telemedicine import create_telemed_session, get_telemed_session, update_telemed_status
from app.appointments.queue import generate_queue_token

logger = logging.getLogger("elderguard.appointments.service")

# In-memory storage for appointments fallback & testing (dict mapping ID -> dict)
_mock_appointments_db: Dict[str, Dict[str, Any]] = {}
_mock_appointment_audit_logs: List[Dict[str, Any]] = []


def _get_raw_appointment(appointment_id: str) -> Optional[Dict[str, Any]]:
    row: Optional[Dict[str, Any]] = None

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM appointments WHERE id = :id LIMIT 1"), {"id": appointment_id})
                r = res.fetchone()
                if r:
                    row = dict(r._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL raw appointment lookup error: {e}")

    if not row and supabase is not None:
        try:
            res = supabase.table("appointments").select("*").eq("id", appointment_id).execute()
            if res.data:
                row = cast(Dict[str, Any], res.data[0])
        except Exception as e:
            logger.warning(f"Cloud Supabase raw appointment lookup error: {e}")

    if not row and appointment_id in _mock_appointments_db:
        row = dict(_mock_appointments_db[appointment_id])

    if row and appointment_id in _mock_appointments_db:
        row.update(_mock_appointments_db[appointment_id])

    return row


def _get_audit_logs(appointment_id: str) -> List[AuditLogResponse]:
    logs: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            res = supabase.table("appointment_audit_log").select("*").eq("appointment_id", appointment_id).order("created_at").execute()
            if res.data:
                logs = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase audit logs error: {e}")

    if not logs and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM appointment_audit_log WHERE appointment_id = :appt_id ORDER BY created_at ASC"),
                    {"appt_id": appointment_id}
                )
                logs = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL audit logs error: {e}")

    if not logs:
        logs = [l for l in _mock_appointment_audit_logs if l.get("appointment_id") == appointment_id]

    return [AuditLogResponse.model_validate(l) for l in sorted(logs, key=lambda x: str(x.get("created_at", "")))]


def _build_appointment_response(appt_dict: Dict[str, Any]) -> AppointmentResponse:
    appt_id = appt_dict["id"]
    mode = ConsultationMode(appt_dict["mode"])
    telemed_resp = None
    if mode == ConsultationMode.TELEMEDICINE:
        telemed_resp = get_telemed_session(appt_id)

    logs = _get_audit_logs(appt_id)

    return AppointmentResponse(
        id=appt_dict["id"],
        elder_id=appt_dict["elder_id"],
        elder_name=appt_dict.get("elder_name"),
        elder_email=appt_dict.get("elder_email"),
        elder_phone_no=appt_dict.get("elder_phone_no"),
        elder_profile_pic_url=appt_dict.get("elder_profile_pic_url"),
        doctor_id=appt_dict["doctor_id"],
        hospital_id=appt_dict.get("hospital_id"),
        appointment_date=str(appt_dict["appointment_date"]),
        start_time=str(appt_dict["start_time"]),
        end_time=str(appt_dict["end_time"]),
        mode=mode,
        status=AppointmentStatus(appt_dict["status"]),
        reschedule_from_id=appt_dict.get("reschedule_from_id"),
        queue_token=appt_dict.get("queue_token"),
        cancelled_by=appt_dict.get("cancelled_by"),
        cancellation_reason=appt_dict.get("cancellation_reason"),
        idempotency_key=appt_dict.get("idempotency_key"),
        created_at=str(appt_dict["created_at"]),
        telemed_session=telemed_resp,
        audit_logs=logs,
    )


def _elder_identity_map(elder_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    identities: Dict[str, Dict[str, Any]] = {}
    unique_ids = [elder_id for elder_id in dict.fromkeys(elder_ids) if elder_id]
    if not unique_ids:
        return identities

    if supabase is not None:
        try:
            res = supabase.table("elder_profiles").select("user_id,name,email,phone_no,profile_pic_url").in_("user_id", unique_ids).execute()
            if res.data:
                for row in cast(List[Dict[str, Any]], res.data):
                    identities[str(row["user_id"])] = {
                        "elder_name": row.get("name"),
                        "elder_email": row.get("email"),
                        "elder_phone_no": row.get("phone_no"),
                        "elder_profile_pic_url": row.get("profile_pic_url"),
                    }
        except Exception as e:
            logger.warning(f"Cloud Supabase elder identity lookup error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                for elder_id in unique_ids:
                    if elder_id in identities:
                        continue
                    res = conn.execute(
                        text("SELECT user_id, name, email, phone_no, profile_pic_url FROM elder_profiles WHERE user_id = :id LIMIT 1"),
                        {"id": elder_id},
                    )
                    row = res.fetchone()
                    if row:
                        r = dict(row._mapping)
                        identities[elder_id] = {
                            "elder_name": r.get("name"),
                            "elder_email": r.get("email"),
                            "elder_phone_no": r.get("phone_no"),
                            "elder_profile_pic_url": r.get("profile_pic_url"),
                        }
        except Exception as e:
            logger.warning(f"Local PostgreSQL elder identity lookup error: {e}")

    return identities


def enforce_transition(
    appt_dict: Dict[str, Any],
    new_status: AppointmentStatus,
    actor_id: Optional[str] = None,
    note: Optional[str] = None
) -> Dict[str, Any]:
    """
    Mandatory State Machine Transition Enforcer.
    """
    current_status = AppointmentStatus(appt_dict["status"])

    if new_status not in STATUS_TRANSITIONS.get(current_status, set()):
        raise InvalidTransitionError(from_status=current_status.value, to_status=new_status.value)

    appt_id = appt_dict["id"]
    now_iso = datetime.now(timezone.utc).isoformat()

    appt_dict["status"] = new_status.value
    appt_dict["updated_at"] = now_iso

    if appt_id in _mock_appointments_db:
        _mock_appointments_db[appt_id]["status"] = new_status.value
        _mock_appointments_db[appt_id]["updated_at"] = now_iso

    if supabase is not None:
        try:
            supabase.table("appointments").update({"status": new_status.value, "updated_at": now_iso}).eq("id", appt_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase status update error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("UPDATE appointments SET status = :status, updated_at = :now_iso WHERE id = :id"),
                    {"status": new_status.value, "now_iso": now_iso, "id": appt_id}
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL status update error: {e}")

    # Record Audit Log
    log_entry = {
        "id": str(uuid.uuid4()),
        "appointment_id": appt_id,
        "action": f"STATUS_CHANGE_{new_status.value.upper()}",
        "from_status": current_status.value,
        "to_status": new_status.value,
        "actor_id": actor_id,
        "actor_user_id": actor_id,
        "note": note,
        "created_at": now_iso,
    }

    _mock_appointment_audit_logs.append(log_entry)

    if supabase is not None:
        try:
            supabase.table("appointment_audit_log").insert(log_entry).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase audit log error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO appointment_audit_log (id, appointment_id, action, from_status, to_status, actor_id, actor_user_id, note, created_at)
                        VALUES (:id, :appointment_id, :action, :from_status, :to_status, :actor_id, :actor_user_id, :note, :created_at)
                    """),
                    log_entry
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL audit log error: {e}")

    return appt_dict


def verify_appointment_access(current_user: dict, elder_id: str, doctor_id: str, hospital_id: Optional[str] = None) -> bool:
    user_id = current_user.get("user_id")
    role = current_user.get("role")

    if user_id in [elder_id, doctor_id, hospital_id]:
        return True
    if role in ["caregiver", "doctor", "hospital", "elder"]:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to operate on this appointment."
    )


# --- CORE SERVICE FUNCTIONS ---

def book_appointment(payload: AppointmentBookRequest, current_user: dict) -> AppointmentResponse:
    # 1. Idempotency Check
    if payload.idempotency_key:
        for a in _mock_appointments_db.values():
            if a.get("idempotency_key") == payload.idempotency_key:
                return _build_appointment_response(a)

        if supabase is not None:
            try:
                res = supabase.table("appointments").select("*").eq("idempotency_key", payload.idempotency_key).execute()
                if res.data:
                    return _build_appointment_response(cast(Dict[str, Any], res.data[0]))
            except Exception as e:
                logger.warning(f"Cloud Supabase idempotency check error: {e}")

        if local_engine is not None:
            try:
                with local_engine.connect() as conn:
                    res = conn.execute(
                        text("SELECT * FROM appointments WHERE idempotency_key = :key LIMIT 1"),
                        {"key": payload.idempotency_key}
                    )
                    row = res.fetchone()
                    if row:
                        return _build_appointment_response(dict(row._mapping))
            except Exception as e:
                logger.warning(f"Local PostgreSQL idempotency check error: {e}")

    verify_appointment_access(current_user, payload.elder_id, payload.doctor_id, payload.hospital_id)
    date_str = payload.appointment_date.isoformat()

    # 2. Double Booking Conflict Validation
    for a in _mock_appointments_db.values():
        if a.get("doctor_id") == payload.doctor_id and str(a.get("appointment_date")) == date_str and str(a.get("start_time")) == str(payload.start_time) and a.get("status") not in ["cancelled", "rescheduled"]:
            raise SlotConflictError(f"Doctor '{payload.doctor_id}' is already booked at {date_str} {payload.start_time}.")

    if supabase is not None:
        try:
            res = supabase.table("appointments").select("id").eq("doctor_id", payload.doctor_id).eq("appointment_date", date_str).eq("start_time", str(payload.start_time)).neq("status", "cancelled").neq("status", "rescheduled").execute()
            if res.data:
                raise SlotConflictError(f"Doctor '{payload.doctor_id}' is already booked at {date_str} {payload.start_time}.")
        except SlotConflictError:
            raise
        except Exception as e:
            logger.warning(f"Cloud Supabase slot conflict check error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("""
                        SELECT id FROM appointments 
                        WHERE doctor_id = :doctor_id AND appointment_date = :app_date AND start_time = :start_time 
                        AND status NOT IN ('cancelled', 'rescheduled')
                    """),
                    {"doctor_id": payload.doctor_id, "app_date": date_str, "start_time": str(payload.start_time)}
                )
                if res.fetchone():
                    raise SlotConflictError(f"Doctor '{payload.doctor_id}' is already booked at {date_str} {payload.start_time}.")
        except SlotConflictError:
            raise
        except Exception as e:
            logger.warning(f"Local PostgreSQL slot conflict check error: {e}")

    # 3. Insert Appointment
    appt_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    appt_data = {
        "id": appt_id,
        "elder_id": payload.elder_id,
        "doctor_id": payload.doctor_id,
        "hospital_id": payload.hospital_id,
        "appointment_date": date_str,
        "start_time": str(payload.start_time),
        "end_time": str(payload.end_time),
        "mode": payload.mode.value,
        "status": AppointmentStatus.SCHEDULED.value,
        "reschedule_from_id": None,
        "queue_token": None,
        "cancelled_by": None,
        "cancellation_reason": None,
        "idempotency_key": payload.idempotency_key,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    _mock_appointments_db[appt_id] = appt_data

    if supabase is not None:
        try:
            supabase.table("appointments").insert(appt_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert appointment error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO appointments (id, elder_id, doctor_id, hospital_id, appointment_date, start_time, end_time, mode, status, reschedule_from_id, queue_token, cancelled_by, cancellation_reason, idempotency_key, created_at, updated_at)
                        VALUES (:id, :elder_id, :doctor_id, :hospital_id, :appointment_date, :start_time, :end_time, :mode, :status, :reschedule_from_id, :queue_token, :cancelled_by, :cancellation_reason, :idempotency_key, :created_at, :updated_at)
                    """),
                    appt_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert appointment error: {e}")

    # Initial Audit Log
    init_log = {
        "id": str(uuid.uuid4()),
        "appointment_id": appt_id,
        "action": "BOOKED",
        "from_status": None,
        "to_status": AppointmentStatus.SCHEDULED.value,
        "actor_id": current_user["user_id"],
        "actor_user_id": current_user["user_id"],
        "note": "Appointment booked successfully.",
        "created_at": now_iso,
    }

    _mock_appointment_audit_logs.append(init_log)

    if supabase is not None:
        try:
            supabase.table("appointment_audit_log").insert(init_log).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert initial audit log error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO appointment_audit_log (id, appointment_id, action, from_status, to_status, actor_id, actor_user_id, note, created_at)
                        VALUES (:id, :appointment_id, :action, :from_status, :to_status, :actor_id, :actor_user_id, :note, :created_at)
                    """),
                    init_log
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert initial audit log error: {e}")

    if payload.mode == ConsultationMode.TELEMEDICINE:
        create_telemed_session(appointment_id=appt_id)

    try:
        broadcast_notification(
            recipient_ids=[payload.elder_id],
            title="Appointment Scheduled",
            body=f"Your appointment with doctor {payload.doctor_id[:6]} is confirmed for {date_str} at {payload.start_time}.",
            type="info",
            priority="NORMAL",
            payload={"appointment_id": appt_id}
        )
    except Exception as e:
        logger.error(f"Failed to dispatch booking notification: {e}")

    return _build_appointment_response(appt_data)


def confirm_appointment(appointment_id: str, current_user: dict) -> AppointmentResponse:
    appt = _get_raw_appointment(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found.")

    verify_appointment_access(current_user, appt["elder_id"], appt["doctor_id"], appt.get("hospital_id"))
    enforce_transition(appt, AppointmentStatus.CONFIRMED, actor_id=current_user["user_id"], note="Confirmed by provider/elder.")
    return _build_appointment_response(appt)


def check_in_appointment(appointment_id: str, current_user: dict) -> AppointmentResponse:
    appt = _get_raw_appointment(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found.")

    verify_appointment_access(current_user, appt["elder_id"], appt["doctor_id"], appt.get("hospital_id"))

    if not appt.get("queue_token"):
        token = generate_queue_token(appt["doctor_id"], date.fromisoformat(str(appt["appointment_date"])))
        appt["queue_token"] = token
        if appointment_id in _mock_appointments_db:
            _mock_appointments_db[appointment_id]["queue_token"] = token

        if supabase is not None:
            try:
                supabase.table("appointments").update({"queue_token": token}).eq("id", appointment_id).execute()
            except Exception as e:
                logger.error(f"Cloud Supabase queue_token update error: {e}")
        if local_engine is not None:
            try:
                with local_engine.connect() as conn:
                    conn.execute(text("UPDATE appointments SET queue_token = :token WHERE id = :id"), {"token": token, "id": appointment_id})
                    conn.commit()
            except Exception as e:
                logger.error(f"Local PostgreSQL queue_token update error: {e}")

    enforce_transition(appt, AppointmentStatus.CHECKED_IN, actor_id=current_user["user_id"], note="Patient checked in.")
    return _build_appointment_response(appt)


def start_consultation(appointment_id: str, current_user: dict) -> AppointmentResponse:
    appt = _get_raw_appointment(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found.")

    verify_appointment_access(current_user, appt["elder_id"], appt["doctor_id"], appt.get("hospital_id"))
    enforce_transition(appt, AppointmentStatus.IN_CONSULTATION, actor_id=current_user["user_id"], note="Consultation started.")

    if ConsultationMode(appt["mode"]) == ConsultationMode.TELEMEDICINE:
        update_telemed_status(appointment_id, TelemedStatus.ACTIVE)

    return _build_appointment_response(appt)


def complete_appointment(appointment_id: str, current_user: dict) -> AppointmentResponse:
    appt = _get_raw_appointment(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found.")

    verify_appointment_access(current_user, appt["elder_id"], appt["doctor_id"], appt.get("hospital_id"))
    enforce_transition(appt, AppointmentStatus.COMPLETED, actor_id=current_user["user_id"], note="Appointment completed.")

    if ConsultationMode(appt["mode"]) == ConsultationMode.TELEMEDICINE:
        update_telemed_status(appointment_id, TelemedStatus.ENDED)

    return _build_appointment_response(appt)


def cancel_appointment(appointment_id: str, payload: AppointmentCancelRequest, current_user: dict) -> AppointmentResponse:
    appt = _get_raw_appointment(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found.")

    verify_appointment_access(current_user, appt["elder_id"], appt["doctor_id"], appt.get("hospital_id"))

    appt["cancelled_by"] = payload.cancelled_by.value
    appt["cancellation_reason"] = payload.cancellation_reason

    if appointment_id in _mock_appointments_db:
        _mock_appointments_db[appointment_id]["cancelled_by"] = payload.cancelled_by.value
        _mock_appointments_db[appointment_id]["cancellation_reason"] = payload.cancellation_reason

    if supabase is not None:
        try:
            supabase.table("appointments").update({
                "cancelled_by": payload.cancelled_by.value,
                "cancellation_reason": payload.cancellation_reason
            }).eq("id", appointment_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase cancel update error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("UPDATE appointments SET cancelled_by = :c_by, cancellation_reason = :c_reason WHERE id = :id"),
                    {"c_by": payload.cancelled_by.value, "c_reason": payload.cancellation_reason, "id": appointment_id}
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL cancel update error: {e}")

    enforce_transition(
        appt,
        AppointmentStatus.CANCELLED,
        actor_id=current_user["user_id"],
        note=f"Cancelled by {payload.cancelled_by.value}. Reason: {payload.cancellation_reason or 'None'}"
    )

    if ConsultationMode(appt["mode"]) == ConsultationMode.TELEMEDICINE:
        update_telemed_status(appointment_id, TelemedStatus.EXPIRED)

    return _build_appointment_response(appt)


def reschedule_appointment(appointment_id: str, payload: AppointmentRescheduleRequest, current_user: dict) -> AppointmentResponse:
    orig_appt = _get_raw_appointment(appointment_id)
    if not orig_appt:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found.")

    verify_appointment_access(current_user, orig_appt["elder_id"], orig_appt["doctor_id"], orig_appt.get("hospital_id"))

    enforce_transition(
        orig_appt,
        AppointmentStatus.RESCHEDULED,
        actor_id=current_user["user_id"],
        note=f"Rescheduled to {payload.new_date.isoformat()} at {payload.new_start_time}."
    )

    new_mode = payload.new_mode or ConsultationMode(orig_appt["mode"])
    new_book_req = AppointmentBookRequest(
        elder_id=orig_appt["elder_id"],
        doctor_id=orig_appt["doctor_id"],
        hospital_id=orig_appt.get("hospital_id"),
        appointment_date=payload.new_date,
        start_time=payload.new_start_time,
        end_time=payload.new_end_time,
        mode=new_mode
    )

    new_resp = book_appointment(new_book_req, current_user)

    if new_resp.id in _mock_appointments_db:
        _mock_appointments_db[new_resp.id]["reschedule_from_id"] = appointment_id

    if supabase is not None:
        try:
            supabase.table("appointments").update({"reschedule_from_id": appointment_id}).eq("id", new_resp.id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase reschedule_from_id update error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("UPDATE appointments SET reschedule_from_id = :from_id WHERE id = :id"),
                    {"from_id": appointment_id, "id": new_resp.id}
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL reschedule_from_id update error: {e}")

    updated_raw = _get_raw_appointment(new_resp.id)
    if not updated_raw:
        return new_resp
    return _build_appointment_response(updated_raw)


def get_appointment(appointment_id: str, current_user: dict) -> AppointmentResponse:
    appt = _get_raw_appointment(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found.")

    verify_appointment_access(current_user, appt["elder_id"], appt["doctor_id"], appt.get("hospital_id"))
    return _build_appointment_response(appt)


def list_appointments_for_user(current_user: dict, elder_id: Optional[str] = None, doctor_id: Optional[str] = None) -> List[AppointmentResponse]:
    all_appts: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            q = supabase.table("appointments").select("*")
            if elder_id:
                q = q.eq("elder_id", elder_id)
            if doctor_id:
                q = q.eq("doctor_id", doctor_id)
            res = q.order("appointment_date", desc=True).execute()
            if res.data:
                all_appts = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase list appointments error: {e}")

    if not all_appts and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                sql = "SELECT * FROM appointments WHERE 1=1"
                params = {}
                if elder_id:
                    sql += " AND elder_id = :elder_id"
                    params["elder_id"] = elder_id
                if doctor_id:
                    sql += " AND doctor_id = :doctor_id"
                    params["doctor_id"] = doctor_id
                sql += " ORDER BY appointment_date DESC"
                res = conn.execute(text(sql), params)
                all_appts = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL list appointments error: {e}")

    if not all_appts:
        all_appts = [a for a in _mock_appointments_db.values() if (not elder_id or a.get("elder_id") == elder_id) and (not doctor_id or a.get("doctor_id") == doctor_id)]

    identities = _elder_identity_map([str(a.get("elder_id")) for a in all_appts])
    for appt in all_appts:
        appt.update(identities.get(str(appt.get("elder_id")), {}))

    return [_build_appointment_response(a) for a in all_appts]
