import logging
from typing import List, Dict, Any, Optional

from app.core.database import supabase
from app.notifications.channels.in_app import deliver_in_app, _mock_notifications_db
from app.notifications.channels.push_fcm import send_push
from app.notifications.channels.telegram import send_telegram_message

logger = logging.getLogger("elderguard.notifications.service")


def _update_delivered_via(notif_id: str, delivered_via_list: List[str]):
    """Helper to update delivered_via array in notifications row."""
    if supabase is not None:
        try:
            supabase.table("notifications").update({"delivered_via": delivered_via_list}).eq("id", notif_id).execute()
        except Exception as e:
            logger.warning(f"Failed to update delivered_via in Supabase DB: {e}")
    
    if notif_id in _mock_notifications_db:
        _mock_notifications_db[notif_id]["delivered_via"] = delivered_via_list


def send_alarm_trigger(elder_id: str, session_id: str, title: str, body: str, medicines: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Delivers high-priority alarm notification to an elder.
    Channels: In-App + FCM Push (No Telegram).
    """
    payload_data = {
        "session_id": session_id,
        "medicines": medicines
    }

    delivered_channels = []
    status_summary = {}

    # 1. In-App Delivery
    notif_id = None
    try:
        in_app_row = deliver_in_app(
            recipient_id=elder_id,
            type="alarm",
            title=title,
            body=body,
            payload=payload_data,
            priority="high"
        )
        notif_id = in_app_row.get("id")
        delivered_channels.append("in_app")
        status_summary["in_app"] = {"success": True}
    except Exception as e:
        logger.error(f"In-App delivery failed for alarm: {e}")
        status_summary["in_app"] = {"success": False, "error": str(e)}

    # 2. Push FCM Delivery
    try:
        fcm_res = send_push(
            user_id=elder_id,
            title=title,
            body=body,
            data_payload={"type": "alarm", "session_id": session_id}
        )
        status_summary["push_fcm"] = fcm_res
        if fcm_res.get("success"):
            delivered_channels.append("push")
    except Exception as e:
        logger.error(f"FCM Push delivery failed for alarm: {e}")
        status_summary["push_fcm"] = {"success": False, "error": str(e)}

    # 3. Update delivered_via array
    if notif_id:
        _update_delivered_via(notif_id, delivered_channels)

    return {
        "notification_id": notif_id,
        "delivered_via": delivered_channels,
        "channel_status": status_summary
    }


def send_alert(recipient_id: str, message: str, priority: str = "high") -> Dict[str, Any]:
    """
    Delivers high-priority alert (SOS, missed dose escalation, appointment cancellation).
    Channels: In-App + FCM Push + Telegram Bot.
    """
    delivered_channels = []
    status_summary = {}

    # 1. In-App Delivery
    notif_id = None
    try:
        in_app_row = deliver_in_app(
            recipient_id=recipient_id,
            type="alert",
            title="Alert",
            body=message,
            payload=None,
            priority=priority
        )
        notif_id = in_app_row.get("id")
        delivered_channels.append("in_app")
        status_summary["in_app"] = {"success": True}
    except Exception as e:
        logger.error(f"In-App delivery failed for alert: {e}")
        status_summary["in_app"] = {"success": False, "error": str(e)}

    # 2. Push FCM Delivery
    try:
        fcm_res = send_push(
            user_id=recipient_id,
            title="Alert",
            body=message,
            data_payload={"type": "alert"}
        )
        status_summary["push_fcm"] = fcm_res
        if fcm_res.get("success"):
            delivered_channels.append("push")
    except Exception as e:
        logger.error(f"FCM Push delivery failed for alert: {e}")
        status_summary["push_fcm"] = {"success": False, "error": str(e)}

    # 3. Telegram Bot Delivery
    try:
        tg_res = send_telegram_message(user_id=recipient_id, text=f"🚨 *ElderGuard Alert*\n\n{message}")
        status_summary["telegram"] = tg_res
        if tg_res.get("success"):
            delivered_channels.append("telegram")
    except Exception as e:
        logger.error(f"Telegram delivery failed for alert: {e}")
        status_summary["telegram"] = {"success": False, "error": str(e)}

    # 4. Update delivered_via array
    if notif_id:
        _update_delivered_via(notif_id, delivered_channels)

    return {
        "notification_id": notif_id,
        "delivered_via": delivered_channels,
        "channel_status": status_summary
    }


def send_notification(
    recipient_id: str,
    title: str,
    body: str,
    type: str = "info",
    priority: str = "normal",
    payload: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    General-purpose info notification.
    Channels: In-App (Push FCM included if priority='high').
    """
    delivered_channels = []
    status_summary = {}

    # 1. In-App Delivery
    notif_id = None
    try:
        in_app_row = deliver_in_app(
            recipient_id=recipient_id,
            type=type,
            title=title,
            body=body,
            payload=payload,
            priority=priority
        )
        notif_id = in_app_row.get("id")
        delivered_channels.append("in_app")
        status_summary["in_app"] = {"success": True}
    except Exception as e:
        logger.error(f"In-App delivery failed for info notification: {e}")
        status_summary["in_app"] = {"success": False, "error": str(e)}

    # 2. Push FCM Delivery (only if priority == 'high')
    if priority == "high":
        try:
            fcm_res = send_push(
                user_id=recipient_id,
                title=title,
                body=body,
                data_payload=payload
            )
            status_summary["push_fcm"] = fcm_res
            if fcm_res.get("success"):
                delivered_channels.append("push")
        except Exception as e:
            logger.error(f"FCM Push delivery failed for info notification: {e}")
            status_summary["push_fcm"] = {"success": False, "error": str(e)}

    # 3. Update delivered_via array
    if notif_id:
        _update_delivered_via(notif_id, delivered_channels)

    return {
        "notification_id": notif_id,
        "delivered_via": delivered_channels,
        "channel_status": status_summary
    }


# Backwards compatibility helper for missed dose escalation
def send_missed_dose_alert(elder_id: str, session_id: str, medicines: List[Dict[str, str]], caregiver_ids: List[str]) -> Dict[str, Any]:
    med_summary = ", ".join([f"{m['name']} ({m['dosage']})" for m in medicines])
    msg = f"Elder missed scheduled medicine dose: {med_summary} after 3 ring attempts."
    results = {}
    for cg_id in caregiver_ids:
        results[cg_id] = send_alert(recipient_id=cg_id, message=msg, priority="high")
    return results


def broadcast_notification(
    recipient_ids: List[str],
    title: str,
    body: str,
    type: str = "alert",
    priority: str = "CRITICAL",
    payload: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Broadcasts a notification to multiple recipient users.
    Priorities: CRITICAL, HIGH, NORMAL, LOW.
    Returns broadcast summary including broadcast_id.
    """
    import uuid
    broadcast_id = f"broadcast_{uuid.uuid4()}"
    p_lower = priority.lower()
    
    results = {}
    for recipient_id in recipient_ids:
        if p_lower in ["critical", "high"]:
            res = send_alert(recipient_id=recipient_id, message=f"{title}: {body}", priority=p_lower)
        else:
            res = send_notification(
                recipient_id=recipient_id,
                title=title,
                body=body,
                type=type,
                priority=p_lower,
                payload=payload
            )
        results[recipient_id] = res

    return {
        "broadcast_id": broadcast_id,
        "recipients_count": len(recipient_ids),
        "priority": priority,
        "results": results
    }

