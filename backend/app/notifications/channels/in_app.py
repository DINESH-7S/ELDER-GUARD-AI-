import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.database import supabase

# In-memory store fallback for offline/local testing when Supabase DB is unconfigured
_mock_notifications_db: Dict[str, Dict[str, Any]] = {}


def deliver_in_app(
    recipient_id: str,
    type: str,
    title: str,
    body: str,
    payload: Optional[Dict[str, Any]] = None,
    priority: str = "normal"
) -> Dict[str, Any]:
    """
    Inserts a row into notifications table for in-app delivery.
    Supabase Realtime automatically broadcasts this row to subscribed client frontends.
    """
    notif_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    row_data = {
        "id": notif_id,
        "recipient_id": recipient_id,
        "type": type,
        "title": title,
        "body": body,
        "payload": payload or {},
        "priority": priority,
        "is_read": False,
        "delivered_via": ["in_app"],
        "created_at": now_str,
    }

    if supabase is not None:
        try:
            res = supabase.table("notifications").insert(row_data).execute()
            if res.data:
                row_data = res.data[0]
        except Exception:
            _mock_notifications_db[notif_id] = row_data
    else:
        _mock_notifications_db[notif_id] = row_data

    return row_data
