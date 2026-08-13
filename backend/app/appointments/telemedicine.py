import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from app.core.database import supabase
from app.appointments.constants import TelemedStatus
from app.appointments.schemas import TelemedSessionResponse

_mock_telemed_db: Dict[str, Dict[str, Any]] = {}


def create_telemed_session(appointment_id: str, duration_minutes: int = 60) -> TelemedSessionResponse:
    session_id = str(uuid.uuid4())
    room_name = f"elderguard-room-{appointment_id[:8]}"
    now_dt = datetime.now(timezone.utc)
    expires_dt = now_dt + timedelta(minutes=duration_minutes + 120)

    join_url = f"https://meet.elderguard.ai/join/{room_name}?role=patient"
    host_url = f"https://meet.elderguard.ai/host/{room_name}?role=doctor"

    session_data = {
        "id": session_id,
        "appointment_id": appointment_id,
        "room_name": room_name,
        "join_url": join_url,
        "host_url": host_url,
        "status": TelemedStatus.CREATED.value,
        "expires_at": expires_dt.isoformat(),
        "started_at": None,
        "ended_at": None,
        "created_at": now_dt.isoformat(),
    }

    _mock_telemed_db[session_id] = session_data

    if supabase is not None:
        try:
            supabase.table("telemed_sessions").insert(session_data).execute()
        except Exception:
            pass

    return TelemedSessionResponse(**session_data)


def get_telemed_session(appointment_id: str) -> Optional[TelemedSessionResponse]:
    data = None
    if supabase is not None:
        try:
            res = supabase.table("telemed_sessions").select("*").eq("appointment_id", appointment_id).execute()
            if res.data:
                data = res.data[0]
        except Exception:
            pass

    if not data:
        for s in _mock_telemed_db.values():
            if s.get("appointment_id") == appointment_id:
                data = s
                break

    return TelemedSessionResponse(**data) if data else None


def update_telemed_status(appointment_id: str, new_status: TelemedStatus) -> Optional[TelemedSessionResponse]:
    session = get_telemed_session(appointment_id)
    if not session:
        return None

    now_iso = datetime.now(timezone.utc).isoformat()
    update_dict = {"status": new_status.value}
    if new_status == TelemedStatus.ACTIVE:
        update_dict["started_at"] = now_iso
    elif new_status == TelemedStatus.ENDED or new_status == TelemedStatus.EXPIRED:
        update_dict["ended_at"] = now_iso

    if session.id in _mock_telemed_db:
        _mock_telemed_db[session.id].update(update_dict)

    if supabase is not None:
        try:
            supabase.table("telemed_sessions").update(update_dict).eq("id", session.id).execute()
        except Exception:
            pass

    return get_telemed_session(appointment_id)
