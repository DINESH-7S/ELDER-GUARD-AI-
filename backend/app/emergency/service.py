import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy import text

from app.core.database import supabase, local_engine
from app.notifications.service import broadcast_notification
from app.emergency.models import SOSStatus, SOSRecipientType, SOSLogAction
from app.emergency.schemas import SOSEventResponse, SOSEventLogResponse, SOSEscalationTierResponse

logger = logging.getLogger("elderguard.emergency.service")

# In-memory mock storage for emergency SOS testing & fallback
_mock_sos_events_db: Dict[str, Dict[str, Any]] = {}
_mock_sos_logs_db: List[Dict[str, Any]] = []
_mock_elder_profiles: Dict[str, Dict[str, Any]] = {}
_mock_elder_caregiver_links: List[Dict[str, Any]] = []


def _get_elder_profile(elder_id: str) -> Dict[str, Any]:
    if supabase is not None:
        try:
            res = supabase.table("elder_profiles").select("*").eq("user_id", elder_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase elder profile lookup error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM elder_profiles WHERE user_id = :id LIMIT 1"), {"id": elder_id})
                row = res.fetchone()
                if row:
                    return dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL elder profile lookup error: {e}")

    if elder_id in _mock_elder_profiles:
        return _mock_elder_profiles[elder_id]

    return {
        "user_id": elder_id,
        "name": f"Elder {elder_id[:6]}",
        "phone_no": None,
        "caregiver_id": None,
        "primary_hospital_id": None
    }


def _get_linked_recipients(elder_id: str, recipient_type: str, recipient_id: Optional[str] = None) -> List[str]:
    """Resolves specific user IDs for a given recipient_type for an elder."""
    if recipient_id:
        return [recipient_id]

    recipients = []
    if recipient_type in ["caregiver", "secondary_caregiver"]:
        if supabase is not None:
            try:
                res = supabase.table("elder_caregiver_links").select("caregiver_id").eq("elder_id", elder_id).execute()
                if res.data:
                    recipients.extend([r["caregiver_id"] for r in res.data if r.get("caregiver_id")])
            except Exception as e:
                logger.warning(f"Cloud Supabase caregiver links lookup error: {e}")

        if not recipients and local_engine is not None:
            try:
                with local_engine.connect() as conn:
                    res = conn.execute(text("SELECT caregiver_id FROM elder_caregiver_links WHERE elder_id = :elder_id"), {"elder_id": elder_id})
                    recipients.extend([r[0] for r in res.fetchall() if r[0]])
            except Exception as e:
                logger.warning(f"Local PostgreSQL caregiver links lookup error: {e}")

        if not recipients:
            recipients.extend([link["caregiver_id"] for link in _mock_elder_caregiver_links if link.get("elder_id") == elder_id])

        profile = _get_elder_profile(elder_id)
        if profile.get("caregiver_id"):
            recipients.append(profile["caregiver_id"])

    elif recipient_type in ["hospital", "emergency_services"]:
        profile = _get_elder_profile(elder_id)
        if profile.get("primary_hospital_id"):
            recipients.append(profile["primary_hospital_id"])

    return list(set(recipients))


def _get_tiers_for_elder(elder_id: str) -> List[Dict[str, Any]]:
    custom_tiers = []
    if supabase is not None:
        try:
            res = supabase.table("sos_escalation_tiers").select("*").eq("elder_id", elder_id).order("tier_number").execute()
            if res.data:
                custom_tiers = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase custom tiers error: {e}")

    if not custom_tiers and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM sos_escalation_tiers WHERE elder_id = :elder_id ORDER BY tier_number ASC"), {"elder_id": elder_id})
                custom_tiers = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL custom tiers error: {e}")

    if custom_tiers:
        return custom_tiers

    # System Default Tiers
    return [
        {"id": f"default_tier_1_{elder_id}", "elder_id": elder_id, "tier_number": 1, "recipient_type": "caregiver", "recipient_id": None, "timeout_minutes": 0},
        {"id": f"default_tier_2_{elder_id}", "elder_id": elder_id, "tier_number": 2, "recipient_type": "secondary_caregiver", "recipient_id": None, "timeout_minutes": 2},
        {"id": f"default_tier_3_{elder_id}", "elder_id": elder_id, "tier_number": 3, "recipient_type": "hospital", "recipient_id": None, "timeout_minutes": 5},
        {"id": f"default_tier_4_{elder_id}", "elder_id": elder_id, "tier_number": 4, "recipient_type": "emergency_services", "recipient_id": None, "timeout_minutes": 10},
    ]


def _log_sos_action(event_id: str, action: SOSLogAction, tier_number: int, recipient_type: SOSRecipientType, recipient_id: str, details: str):
    log_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    log_data = {
        "id": log_id,
        "sos_event_id": event_id,
        "action": action.value,
        "tier_number": tier_number,
        "recipient_type": recipient_type.value,
        "recipient_id": recipient_id,
        "details": details,
        "created_at": now_iso
    }

    _mock_sos_logs_db.append(log_data)

    if supabase is not None:
        try:
            supabase.table("sos_event_log").insert(log_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert sos_event_log error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO sos_event_log (id, sos_event_id, action, tier_number, recipient_type, recipient_id, details, created_at)
                        VALUES (:id, :sos_event_id, :action, :tier_number, :recipient_type, :recipient_id, :details, :created_at)
                    """),
                    log_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert sos_event_log error: {e}")


def _get_logs_for_event(event_id: str) -> List[Dict[str, Any]]:
    logs = []
    if supabase is not None:
        try:
            res = supabase.table("sos_event_log").select("*").eq("sos_event_id", event_id).order("created_at").execute()
            if res.data:
                logs = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase event logs error: {e}")

    if not logs and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM sos_event_log WHERE sos_event_id = :id ORDER BY created_at ASC"), {"id": event_id})
                logs = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL event logs error: {e}")

    if not logs:
        logs = [l for l in _mock_sos_logs_db if l.get("sos_event_id") == event_id]

    return sorted(logs, key=lambda x: str(x.get("created_at", "")))


def _build_event_response(event_dict: Dict[str, Any]) -> SOSEventResponse:
    logs = _get_logs_for_event(event_dict["id"])
    log_responses = [SOSEventLogResponse(**l) for l in logs]
    return SOSEventResponse(
        id=event_dict["id"],
        elder_id=event_dict["elder_id"],
        triggered_at=str(event_dict["triggered_at"]),
        location_lat=event_dict.get("location_lat"),
        location_lng=event_dict.get("location_lng"),
        location_accuracy_m=event_dict.get("location_accuracy_m"),
        status=SOSStatus(event_dict["status"]),
        current_escalation_tier=event_dict.get("current_escalation_tier", 1),
        resolved_at=str(event_dict["resolved_at"]) if event_dict.get("resolved_at") else None,
        resolved_by=event_dict.get("resolved_by"),
        resolution_note=event_dict.get("resolution_note"),
        created_at=str(event_dict["created_at"]),
        logs=log_responses
    )


# --- CORE SERVICE FUNCTIONS ---

def get_active_sos(elder_id: str) -> Optional[SOSEventResponse]:
    events = []
    if supabase is not None:
        try:
            res = supabase.table("sos_events").select("*").eq("elder_id", elder_id).in_("status", ["active", "acknowledged"]).execute()
            if res.data:
                events = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase active sos error: {e}")

    if not events and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM sos_events WHERE elder_id = :elder_id AND status IN ('active', 'acknowledged')"),
                    {"elder_id": elder_id}
                )
                events = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL active sos error: {e}")

    if not events:
        events = [e for e in _mock_sos_events_db.values() if e.get("elder_id") == elder_id and e.get("status") in ["active", "acknowledged"]]

    if not events:
        return None

    events.sort(key=lambda x: str(x.get("triggered_at", "")), reverse=True)
    return _build_event_response(events[0])


def trigger_sos(
    elder_id: str,
    location_lat: Optional[float] = None,
    location_lng: Optional[float] = None,
    location_accuracy_m: Optional[float] = None
) -> SOSEventResponse:
    active_event = get_active_sos(elder_id)
    if active_event:
        logger.info(f"SOS trigger ignored for elder '{elder_id}': Active event '{active_event.id}' already exists.")
        return active_event

    event_id = str(uuid.uuid4())
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()

    event_data = {
        "id": event_id,
        "elder_id": elder_id,
        "triggered_at": now_iso,
        "location_lat": location_lat,
        "location_lng": location_lng,
        "location_accuracy_m": location_accuracy_m,
        "status": SOSStatus.ACTIVE.value,
        "current_escalation_tier": 1,
        "resolved_at": None,
        "resolved_by": None,
        "resolution_note": None,
        "created_at": now_iso,
    }

    _mock_sos_events_db[event_id] = event_data

    if supabase is not None:
        try:
            supabase.table("sos_events").insert(event_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert sos_events error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO sos_events (id, elder_id, triggered_at, location_lat, location_lng, location_accuracy_m, status, current_escalation_tier, resolved_at, resolved_by, resolution_note, created_at)
                        VALUES (:id, :elder_id, :triggered_at, :location_lat, :location_lng, :location_accuracy_m, :status, :current_escalation_tier, :resolved_at, :resolved_by, :resolution_note, :created_at)
                    """),
                    event_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert sos_events error: {e}")

    caregiver_recipients = _get_linked_recipients(elder_id, "caregiver")
    hospital_recipients = _get_linked_recipients(elder_id, "hospital")
    if not hospital_recipients:
        hospital_recipients = ["demo_hospital"]
    
    recipients = list(set(caregiver_recipients + hospital_recipients))
    profile = _get_elder_profile(elder_id)
    elder_name = profile.get("name", "An elder")

    _log_sos_action(
        event_id=event_id,
        action=SOSLogAction.TRIGGERED,
        tier_number=1,
        recipient_type=SOSRecipientType.CAREGIVER,
        recipient_id=elder_id,
        details=f"SOS event triggered by elder '{elder_name}'."
    )

    for r_id in caregiver_recipients:
        _log_sos_action(
            event_id=event_id,
            action=SOSLogAction.TIER_1_NOTIFIED,
            tier_number=1,
            recipient_type=SOSRecipientType.CAREGIVER,
            recipient_id=r_id,
            details=f"Tier 1 SOS Alert dispatched to caregiver '{r_id}' for elder '{elder_name}'."
        )

    for h_id in hospital_recipients:
        _log_sos_action(
            event_id=event_id,
            action=SOSLogAction.TIER_2_ESCALATED,
            tier_number=2,
            recipient_type=SOSRecipientType.HOSPITAL,
            recipient_id=h_id,
            details=f"Emergency SOS Alert dispatched to hospital '{h_id}' for elder '{elder_name}'."
        )

    try:
        broadcast_notification(
            recipient_ids=recipients if recipients else [f"caregiver_of_{elder_id}", f"hospital_of_{elder_id}"],
            title="EMERGENCY SOS ALERT",
            body=f"URGENT: Emergency SOS triggered by {elder_name}! Caretaker & Hospital notified.",
            type="sos",
            priority="CRITICAL",
            payload={"sos_event_id": event_id, "elder_id": elder_id, "location_lat": location_lat, "location_lng": location_lng}
        )
    except Exception as e:
        logger.error(f"Failed to broadcast initial SOS notification: {e}")

    return _build_event_response(event_data)


def acknowledge_sos(event_id: str, current_user: dict) -> SOSEventResponse:
    event_data = _get_raw_sos_event(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"SOS event '{event_id}' not found.")

    if event_data["status"] == SOSStatus.RESOLVED.value:
        raise HTTPException(status_code=400, detail="Cannot acknowledge an already resolved SOS event.")

    user_id = current_user["user_id"]
    role = current_user.get("role", "caregiver")
    now_iso = datetime.now(timezone.utc).isoformat()

    event_data["status"] = SOSStatus.ACKNOWLEDGED.value
    if event_id in _mock_sos_events_db:
        _mock_sos_events_db[event_id]["status"] = SOSStatus.ACKNOWLEDGED.value

    if supabase is not None:
        try:
            supabase.table("sos_events").update({"status": SOSStatus.ACKNOWLEDGED.value}).eq("id", event_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase acknowledge sos error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("UPDATE sos_events SET status = :status WHERE id = :id"),
                    {"status": SOSStatus.ACKNOWLEDGED.value, "id": event_id}
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL acknowledge sos error: {e}")

    rec_enum = SOSRecipientType.CAREGIVER if role == "caregiver" else (SOSRecipientType.HOSPITAL if role == "hospital" else SOSRecipientType.SECONDARY_CAREGIVER)

    _log_sos_action(
        event_id=event_id,
        action=SOSLogAction.ACKNOWLEDGED,
        tier_number=event_data.get("current_escalation_tier", 1),
        recipient_type=rec_enum,
        recipient_id=user_id,
        details=f"SOS event acknowledged by {role} user '{user_id}'."
    )

    return _build_event_response(event_data)


def resolve_sos(event_id: str, current_user: dict, resolution_note: Optional[str] = None) -> SOSEventResponse:
    event_data = _get_raw_sos_event(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"SOS event '{event_id}' not found.")

    if event_data["status"] == SOSStatus.RESOLVED.value:
        return _build_event_response(event_data)

    user_id = current_user["user_id"]
    role = current_user.get("role", "caregiver")
    now_iso = datetime.now(timezone.utc).isoformat()

    update_fields = {
        "status": SOSStatus.RESOLVED.value,
        "resolved_at": now_iso,
        "resolved_by": user_id,
        "resolution_note": resolution_note
    }

    event_data.update(update_fields)

    if event_id in _mock_sos_events_db:
        _mock_sos_events_db[event_id].update(update_fields)

    if supabase is not None:
        try:
            supabase.table("sos_events").update(update_fields).eq("id", event_id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase resolve sos error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("UPDATE sos_events SET status = :status, resolved_at = :resolved_at, resolved_by = :resolved_by, resolution_note = :resolution_note WHERE id = :id"),
                    {**update_fields, "id": event_id}
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL resolve sos error: {e}")

    rec_enum = SOSRecipientType.CAREGIVER if role == "caregiver" else (SOSRecipientType.HOSPITAL if role == "hospital" else SOSRecipientType.SECONDARY_CAREGIVER)

    _log_sos_action(
        event_id=event_id,
        action=SOSLogAction.RESOLVED,
        tier_number=event_data.get("current_escalation_tier", 1),
        recipient_type=rec_enum,
        recipient_id=user_id,
        details=f"SOS event resolved by {role} '{user_id}'. Note: {resolution_note}"
    )

    return _build_event_response(event_data)


def get_sos_history(elder_id: str, current_user: dict) -> List[SOSEventResponse]:
    events = []
    if supabase is not None:
        try:
            res = supabase.table("sos_events").select("*").eq("elder_id", elder_id).order("triggered_at", desc=True).execute()
            if res.data:
                events = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase sos history error: {e}")

    if not events and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM sos_events WHERE elder_id = :elder_id ORDER BY triggered_at DESC"), {"elder_id": elder_id})
                events = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL sos history error: {e}")

    if not events:
        events = [e for e in _mock_sos_events_db.values() if e.get("elder_id") == elder_id]

    events.sort(key=lambda x: str(x.get("triggered_at", "")), reverse=True)
    return [_build_event_response(e) for e in events]


def get_escalation_policy(elder_id: str, current_user: Optional[dict] = None) -> List[SOSEscalationTierResponse]:
    tiers = _get_tiers_for_elder(elder_id)
    return [SOSEscalationTierResponse(**t) for t in tiers]


def _get_raw_sos_event(event_id: str) -> Optional[Dict[str, Any]]:
    if supabase is not None:
        try:
            res = supabase.table("sos_events").select("*").eq("id", event_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase raw sos lookup error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM sos_events WHERE id = :id LIMIT 1"), {"id": event_id})
                row = res.fetchone()
                if row:
                    return dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL raw sos lookup error: {e}")

    if event_id in _mock_sos_events_db:
        return _mock_sos_events_db[event_id]

    return None
