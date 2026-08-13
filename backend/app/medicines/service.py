import uuid
import logging
from datetime import datetime, date, time, timezone, timedelta
from typing import List, Dict, Any, Optional, cast
from fastapi import HTTPException, status
from sqlalchemy import text

from app.core.database import supabase, local_engine
from app.medicines.models import SessionStatus, SessionResolution
from app.medicines.schemas import (
    MedicineCreate,
    MedicineUpdate,
    MedicineResponse,
    ReminderSessionResponse,
    ReminderSessionItemResponse,
)

logger = logging.getLogger("elderguard.medicines.service")

# In-memory storage for fallback & testing (dicts mapping ID -> data)
_mock_medicines_db: Dict[str, Dict[str, Any]] = {}
_mock_sessions_db: Dict[str, Dict[str, Any]] = {}
_mock_items_db: Dict[str, Dict[str, Any]] = {}


def verify_medicine_access_permission(current_user: dict, elder_id: str):
    """
    Validates that current_user is the elder, linked caregiver, or linked doctor.
    """
    user_id = current_user.get("user_id")
    role = current_user.get("role")

    if role == "elder" and user_id == elder_id:
        return True
    if role in ["caregiver", "doctor"]:
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"User with role '{role}' is not authorized to manage medicines for elder '{elder_id}'."
    )


# --- MEDICINE CRUD ---

def create_medicine(payload: MedicineCreate, current_user: dict) -> MedicineResponse:
    verify_medicine_access_permission(current_user, payload.elder_id)

    med_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    med_data = {
        "id": med_id,
        "elder_id": payload.elder_id,
        "name": payload.name,
        "dosage": payload.dosage,
        "times_of_day": payload.times_of_day,
        "start_date": payload.start_date.isoformat(),
        "end_date": payload.end_date.isoformat() if payload.end_date else None,
        "is_active": True,
        "created_by": current_user["user_id"],
        "created_at": now_str,
        "updated_at": now_str,
    }

    _mock_medicines_db[med_id] = med_data

    if supabase is not None:
        try:
            res = supabase.table("medicines").insert(med_data).execute()
            if res.data:
                med_data = res.data[0]
        except Exception as e:
            logger.error(f"Cloud Supabase insert medicine error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO medicines (id, elder_id, name, dosage, times_of_day, start_date, end_date, is_active, created_by, created_at, updated_at)
                        VALUES (:id, :elder_id, :name, :dosage, :times_of_day, :start_date, :end_date, :is_active, :created_by, :created_at, :updated_at)
                    """),
                    med_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert medicine error: {e}")

    return MedicineResponse(**med_data)


def get_medicines_for_elder(elder_id: str, current_user: dict) -> List[MedicineResponse]:
    verify_medicine_access_permission(current_user, elder_id)

    results: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            res = supabase.table("medicines").select("*").eq("elder_id", elder_id).eq("is_active", True).execute()
            if res.data:
                results = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase get medicines error: {e}")

    if not results and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM medicines WHERE elder_id = :elder_id AND is_active = TRUE"),
                    {"elder_id": elder_id}
                )
                results = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL get medicines error: {e}")

    if not results:
        results = [m for m in _mock_medicines_db.values() if m.get("elder_id") == elder_id and m.get("is_active", True)]

    return [MedicineResponse.model_validate(m) for m in results]


def update_medicine(medicine_id: str, payload: MedicineUpdate, current_user: dict) -> MedicineResponse:
    med = _get_medicine_by_id(medicine_id)
    if not med:
        raise HTTPException(status_code=404, detail=f"Medicine '{medicine_id}' not found.")

    verify_medicine_access_permission(current_user, med["elder_id"])

    update_dict = payload.model_dump(exclude_unset=True)
    if "start_date" in update_dict and isinstance(update_dict["start_date"], date):
        update_dict["start_date"] = update_dict["start_date"].isoformat()
    if "end_date" in update_dict and isinstance(update_dict["end_date"], date):
        update_dict["end_date"] = update_dict["end_date"].isoformat()
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    med.update(update_dict)

    if medicine_id in _mock_medicines_db:
        _mock_medicines_db[medicine_id].update(update_dict)

    if supabase is not None:
        try:
            supabase.table("medicines").update(update_dict).eq("id", medicine_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase update medicine error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                set_clauses = [f"{k} = :{k}" for k in update_dict.keys()]
                update_dict["id"] = medicine_id
                conn.execute(text(f"UPDATE medicines SET {', '.join(set_clauses)} WHERE id = :id"), update_dict)
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL update medicine error: {e}")

    return MedicineResponse(**med)


def deactivate_medicine(medicine_id: str, current_user: dict) -> Dict[str, str]:
    med = _get_medicine_by_id(medicine_id)
    if not med:
        raise HTTPException(status_code=404, detail=f"Medicine '{medicine_id}' not found.")

    verify_medicine_access_permission(current_user, med["elder_id"])

    now_str = datetime.now(timezone.utc).isoformat()

    if medicine_id in _mock_medicines_db:
        _mock_medicines_db[medicine_id]["is_active"] = False
        _mock_medicines_db[medicine_id]["updated_at"] = now_str

    if supabase is not None:
        try:
            supabase.table("medicines").update({"is_active": False, "updated_at": now_str}).eq("id", medicine_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase deactivate medicine error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(text("UPDATE medicines SET is_active = FALSE, updated_at = :updated_at WHERE id = :id"), {"id": medicine_id, "updated_at": now_str})
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL deactivate medicine error: {e}")

    return {"status": "success", "message": f"Medicine '{medicine_id}' deactivated."}


def _get_medicine_by_id(medicine_id: str) -> Optional[Dict[str, Any]]:
    if supabase is not None:
        try:
            res = supabase.table("medicines").select("*").eq("id", medicine_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase get medicine by id error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM medicines WHERE id = :id LIMIT 1"), {"id": medicine_id})
                row = res.fetchone()
                if row:
                    return dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL get medicine by id error: {e}")

    if medicine_id in _mock_medicines_db:
        return _mock_medicines_db[medicine_id]

    return None


# --- NIGHTLY SESSION GENERATION ---

def generate_nightly_sessions(target_date: date) -> List[ReminderSessionResponse]:
    all_medicines = []
    if supabase is not None:
        try:
            res = supabase.table("medicines").select("*").eq("is_active", True).execute()
            if res.data:
                all_medicines = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase fetch active medicines error: {e}")

    if not all_medicines and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM medicines WHERE is_active = TRUE"))
                all_medicines = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL fetch active medicines error: {e}")

    if not all_medicines:
        all_medicines = [m for m in _mock_medicines_db.values() if m.get("is_active", True)]

    valid_medicines = []
    for m in all_medicines:
        start_d = date.fromisoformat(m["start_date"]) if isinstance(m["start_date"], str) else m["start_date"]
        end_d = date.fromisoformat(m["end_date"]) if (m.get("end_date") and isinstance(m["end_date"], str)) else m.get("end_date")
        
        if target_date >= start_d and (end_d is None or target_date <= end_d):
            valid_medicines.append(m)

    grouped: Dict[tuple, List[Dict[str, Any]]] = {}
    for m in valid_medicines:
        elder_id = m["elder_id"]
        times = m.get("times_of_day", [])
        for t_str in times:
            key = (elder_id, t_str)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(m)

    created_sessions: List[ReminderSessionResponse] = []

    for (elder_id, t_str), meds in grouped.items():
        session_id = str(uuid.uuid4())
        hour, minute = map(int, t_str.split(":"))
        scheduled_dt = datetime.combine(target_date, time(hour=hour, minute=minute), tzinfo=timezone.utc)
        now_str = datetime.now(timezone.utc).isoformat()

        session_data = {
            "id": session_id,
            "elder_id": elder_id,
            "scheduled_time": scheduled_dt.isoformat(),
            "status": SessionStatus.PENDING.value,
            "attempt_count": 0,
            "max_attempts": 3,
            "current_ring_started_at": None,
            "next_retry_at": None,
            "resolved_at": None,
            "resolution": None,
            "created_at": now_str,
        }

        _mock_sessions_db[session_id] = session_data

        item_responses: List[ReminderSessionItemResponse] = []
        raw_items_list = []

        for m in meds:
            item_id = str(uuid.uuid4())
            item_data = {
                "id": item_id,
                "session_id": session_id,
                "medicine_id": m["id"],
                "medicine_name": m["name"],
                "dosage": m["dosage"],
                "marked_taken": False,
                "marked_taken_at": None
            }
            raw_items_list.append(item_data)
            _mock_items_db[item_id] = item_data
            item_responses.append(ReminderSessionItemResponse(**item_data))

        if supabase is not None:
            try:
                supabase.table("reminder_sessions").insert(session_data).execute()
                supabase.table("reminder_session_items").insert(raw_items_list).execute()
            except Exception as e:
                logger.error(f"Cloud Supabase session insert error: {e}")

        if local_engine is not None:
            try:
                with local_engine.connect() as conn:
                    conn.execute(
                        text("""
                            INSERT INTO reminder_sessions (id, elder_id, scheduled_time, status, attempt_count, max_attempts, current_ring_started_at, next_retry_at, resolved_at, resolution, created_at)
                            VALUES (:id, :elder_id, :scheduled_time, :status, :attempt_count, :max_attempts, :current_ring_started_at, :next_retry_at, :resolved_at, :resolution, :created_at)
                        """),
                        session_data
                    )
                    for raw_item in raw_items_list:
                        conn.execute(
                            text("""
                                INSERT INTO reminder_session_items (id, session_id, medicine_id, medicine_name, dosage, marked_taken, marked_taken_at)
                                VALUES (:id, :session_id, :medicine_id, :medicine_name, :dosage, :marked_taken, :marked_taken_at)
                            """),
                            raw_item
                        )
                    conn.commit()
            except Exception as e:
                logger.error(f"Local PostgreSQL session insert error: {e}")

        session_resp = ReminderSessionResponse(**session_data)
        session_resp.items = item_responses
        created_sessions.append(session_resp)

    return created_sessions


# --- REMINDER ACTION ENDPOINTS ---

def get_active_session_for_elder(elder_id: str) -> Optional[ReminderSessionResponse]:
    sessions: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            res = supabase.table("reminder_sessions").select("*").eq("elder_id", elder_id).in_("status", ["RINGING", "RETRY_WAIT", "PENDING"]).execute()
            if res.data:
                sessions = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase active session error: {e}")

    if not sessions and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM reminder_sessions WHERE elder_id = :elder_id AND status IN ('RINGING', 'RETRY_WAIT', 'PENDING')"),
                    {"elder_id": elder_id}
                )
                sessions = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL active session error: {e}")

    if not sessions:
        sessions = [s for s in _mock_sessions_db.values() if s.get("elder_id") == elder_id and s.get("status") in ["RINGING", "RETRY_WAIT", "PENDING"]]

    if not sessions:
        return None

    sessions.sort(key=lambda s: 0 if s["status"] == "RINGING" else (1 if s["status"] == "RETRY_WAIT" else 2))
    target_session = sessions[0]
    session_id = target_session["id"]

    items = _get_session_items(session_id)
    resp = ReminderSessionResponse.model_validate(target_session)
    resp.items = items
    return resp


def mark_item_taken(session_id: str, item_id: str) -> ReminderSessionResponse:
    now_str = datetime.now(timezone.utc).isoformat()

    if item_id in _mock_items_db:
        _mock_items_db[item_id]["marked_taken"] = True
        _mock_items_db[item_id]["marked_taken_at"] = now_str

    if supabase is not None:
        try:
            supabase.table("reminder_session_items").update({"marked_taken": True, "marked_taken_at": now_str}).eq("id", item_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase mark_item_taken error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("UPDATE reminder_session_items SET marked_taken = TRUE, marked_taken_at = :now_str WHERE id = :item_id"),
                    {"now_str": now_str, "item_id": item_id}
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL mark_item_taken error: {e}")

    session_items = _get_session_items(session_id)
    all_taken = all(it.marked_taken for it in session_items)

    if all_taken:
        turn_off_session(session_id, SessionResolution.TAKEN)

    return _get_session_response(session_id)


def turn_off_session(session_id: str, resolution: SessionResolution) -> ReminderSessionResponse:
    now_str = datetime.now(timezone.utc).isoformat()

    if session_id in _mock_sessions_db:
        _mock_sessions_db[session_id]["status"] = SessionStatus.RESOLVED.value
        _mock_sessions_db[session_id]["resolution"] = resolution.value
        _mock_sessions_db[session_id]["resolved_at"] = now_str

    if supabase is not None:
        try:
            supabase.table("reminder_sessions").update({
                "status": SessionStatus.RESOLVED.value,
                "resolution": resolution.value,
                "resolved_at": now_str
            }).eq("id", session_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase turn_off_session error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("UPDATE reminder_sessions SET status = :status, resolution = :resolution, resolved_at = :now_str WHERE id = :id"),
                    {
                        "status": SessionStatus.RESOLVED.value,
                        "resolution": resolution.value,
                        "now_str": now_str,
                        "id": session_id
                    }
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL turn_off_session error: {e}")

    if resolution == SessionResolution.TAKEN:
        items = _get_session_items(session_id)
        for it in items:
            if not it.marked_taken:
                if it.id in _mock_items_db:
                    _mock_items_db[it.id]["marked_taken"] = True
                    _mock_items_db[it.id]["marked_taken_at"] = now_str

                if supabase is not None:
                    try:
                        supabase.table("reminder_session_items").update({
                            "marked_taken": True,
                            "marked_taken_at": now_str
                        }).eq("id", it.id).execute()
                    except Exception as e:
                        logger.error(f"Cloud Supabase item update error: {e}")
                if local_engine is not None:
                    try:
                        with local_engine.connect() as conn:
                            conn.execute(
                                text("UPDATE reminder_session_items SET marked_taken = TRUE, marked_taken_at = :now_str WHERE id = :id"),
                                {"now_str": now_str, "id": it.id}
                            )
                            conn.commit()
                    except Exception as e:
                        logger.error(f"Local PostgreSQL item update error: {e}")

    return _get_session_response(session_id)


def _get_session_items(session_id: str) -> List[ReminderSessionItemResponse]:
    raw_items: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            res = supabase.table("reminder_session_items").select("*").eq("session_id", session_id).execute()
            if res.data:
                raw_items = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase session items error: {e}")

    if not raw_items and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM reminder_session_items WHERE session_id = :session_id"), {"session_id": session_id})
                raw_items = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL session items error: {e}")

    if not raw_items:
        raw_items = [it for it in _mock_items_db.values() if it.get("session_id") == session_id]

    return [ReminderSessionItemResponse.model_validate(it) for it in raw_items]


def _get_session_response(session_id: str) -> ReminderSessionResponse:
    session = None
    if supabase is not None:
        try:
            res = supabase.table("reminder_sessions").select("*").eq("id", session_id).execute()
            if res.data:
                session = res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase get session response error: {e}")

    if not session and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM reminder_sessions WHERE id = :id LIMIT 1"), {"id": session_id})
                row = res.fetchone()
                if row:
                    session = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL get session response error: {e}")

    if not session:
        if session_id in _mock_sessions_db:
            session = _mock_sessions_db[session_id]

    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    items = _get_session_items(session_id)
    resp = ReminderSessionResponse.model_validate(session)
    resp.items = items
    return resp


# --- CONNECTED MEDICINES SESSION GENERATION ---

def generate_connected_sessions(target_date: date) -> List[ReminderSessionResponse]:
    """
    Generates reminder sessions from the connected_medicines table.
    This bridges the gap between connected portal medicines and the reminder session system.
    """
    import json

    all_connected_medicines = []

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM connected_medicines WHERE is_active = 1")
                )
                all_connected_medicines = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL fetch connected medicines error: {e}")

    if not all_connected_medicines:
        return []

    # Parse scheduled_times from JSON string
    valid_medicines = []
    for m in all_connected_medicines:
        scheduled_times_raw = m.get("scheduled_times", "[]")
        if isinstance(scheduled_times_raw, str):
            try:
                times = json.loads(scheduled_times_raw)
            except Exception:
                times = []
        elif isinstance(scheduled_times_raw, list):
            times = scheduled_times_raw
        else:
            times = []

        m["_parsed_times"] = times
        if times:
            valid_medicines.append(m)

    # Group by (elder_id, time_str)
    grouped: Dict[tuple, List[Dict[str, Any]]] = {}
    for m in valid_medicines:
        elder_id = m["elder_id"]
        for t_str in m["_parsed_times"]:
            key = (elder_id, t_str)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(m)

    created_sessions: List[ReminderSessionResponse] = []

    for (elder_id, t_str), meds in grouped.items():
        # Check for existing session to avoid duplicates
        session_exists = False
        try:
            t_str_normalized = t_str.zfill(5) if len(t_str) == 4 else t_str
            hour, minute = map(int, t_str_normalized.split(":"))
            scheduled_dt = datetime.combine(target_date, time(hour=hour, minute=minute), tzinfo=timezone.utc)
        except (ValueError, IndexError):
            logger.warning(f"Skipping invalid time format: {t_str}")
            continue

        scheduled_iso = scheduled_dt.isoformat()

        # Check if session already exists for this elder + time
        if local_engine is not None:
            try:
                with local_engine.connect() as conn:
                    res = conn.execute(
                        text("""
                            SELECT id FROM reminder_sessions 
                            WHERE elder_id = :elder_id AND scheduled_time = :scheduled_time
                            LIMIT 1
                        """),
                        {"elder_id": elder_id, "scheduled_time": scheduled_iso}
                    )
                    session_exists = res.fetchone() is not None
            except Exception:
                pass

        # Also check mock DB
        if not session_exists:
            for s in _mock_sessions_db.values():
                if s.get("elder_id") == elder_id and s.get("scheduled_time") == scheduled_iso:
                    session_exists = True
                    break

        if session_exists:
            continue

        session_id = str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat()

        session_data = {
            "id": session_id,
            "elder_id": elder_id,
            "scheduled_time": scheduled_iso,
            "status": SessionStatus.PENDING.value,
            "attempt_count": 0,
            "max_attempts": 3,
            "current_ring_started_at": None,
            "next_retry_at": None,
            "resolved_at": None,
            "resolution": None,
            "created_at": now_str,
        }

        _mock_sessions_db[session_id] = session_data

        item_responses: List[ReminderSessionItemResponse] = []
        raw_items_list = []

        for m in meds:
            item_id = str(uuid.uuid4())
            item_data = {
                "id": item_id,
                "session_id": session_id,
                "medicine_id": m["id"],
                "medicine_name": m["name"],
                "dosage": m["dosage"],
                "marked_taken": False,
                "marked_taken_at": None
            }
            raw_items_list.append(item_data)
            _mock_items_db[item_id] = item_data
            item_responses.append(ReminderSessionItemResponse(**item_data))

        if local_engine is not None:
            try:
                with local_engine.connect() as conn:
                    conn.execute(
                        text("""
                            INSERT INTO reminder_sessions (id, elder_id, scheduled_time, status, attempt_count, max_attempts, current_ring_started_at, next_retry_at, resolved_at, resolution, created_at)
                            VALUES (:id, :elder_id, :scheduled_time, :status, :attempt_count, :max_attempts, :current_ring_started_at, :next_retry_at, :resolved_at, :resolution, :created_at)
                        """),
                        session_data
                    )
                    for raw_item in raw_items_list:
                        conn.execute(
                            text("""
                                INSERT INTO reminder_session_items (id, session_id, medicine_id, medicine_name, dosage, marked_taken, marked_taken_at)
                                VALUES (:id, :session_id, :medicine_id, :medicine_name, :dosage, :marked_taken, :marked_taken_at)
                            """),
                            raw_item
                        )
                    conn.commit()
            except Exception as e:
                logger.error(f"Local PostgreSQL connected session insert error: {e}")

        session_resp = ReminderSessionResponse(**session_data)
        session_resp.items = item_responses
        created_sessions.append(session_resp)

    logger.info(f"Generated {len(created_sessions)} connected medicine sessions for {target_date}")
    return created_sessions

