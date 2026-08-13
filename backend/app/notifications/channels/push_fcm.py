import os
import json
import logging
from typing import Dict, Any, List, Optional
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    HAS_FIREBASE = True
except ImportError:
    firebase_admin = None
    credentials = None
    messaging = None
    HAS_FIREBASE = False

from app.core.config import FIREBASE_CREDENTIALS_JSON
from app.core.database import supabase

logger = logging.getLogger("elderguard.notifications.fcm")

# Initialize Firebase Admin SDK if credentials provided
firebase_app = None
if HAS_FIREBASE and credentials and firebase_admin:
    try:
        firebase_app = firebase_admin.get_app()
    except ValueError:
        try:
            if FIREBASE_CREDENTIALS_JSON and os.path.exists(FIREBASE_CREDENTIALS_JSON):
                cred = credentials.Certificate(FIREBASE_CREDENTIALS_JSON)
                firebase_app = firebase_admin.initialize_app(cred)
            elif FIREBASE_CREDENTIALS_JSON and FIREBASE_CREDENTIALS_JSON.startswith("{"):
                cred_dict = json.loads(FIREBASE_CREDENTIALS_JSON)
                cred = credentials.Certificate(cred_dict)
                firebase_app = firebase_admin.initialize_app(cred)
        except Exception as e:
            logger.warning(f"Firebase Admin SDK initialization failed: {e}")

_mock_device_tokens_db: Dict[str, Dict[str, Any]] = {}


def get_active_device_tokens(user_id: str) -> List[Dict[str, Any]]:
    tokens = []
    if supabase is not None:
        try:
            res = supabase.table("device_tokens").select("*").eq("user_id", user_id).eq("is_active", True).execute()
            if res.data:
                tokens = res.data
        except Exception:
            pass

    if not tokens:
        tokens = [t for t in _mock_device_tokens_db.values() if t.get("user_id") == user_id and t.get("is_active", True)]
    return tokens


def deactivate_device_token(fcm_token: str):
    if supabase is not None:
        try:
            supabase.table("device_tokens").update({"is_active": False}).eq("fcm_token", fcm_token).execute()
        except Exception:
            pass
    for t in _mock_device_tokens_db.values():
        if t.get("fcm_token") == fcm_token:
            t["is_active"] = False


def send_push(user_id: str, title: str, body: str, data_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Sends FCM Push Notification to user's registered active devices.
    """
    tokens = get_active_device_tokens(user_id)
    if not tokens:
        return {"success": False, "reason": "no_device"}

    sent_count = 0

    # Ensure all data values in data payload are strings for FCM payload requirements
    stringified_data = {}
    if data_payload:
        for k, v in data_payload.items():
            if isinstance(v, (dict, list)):
                stringified_data[k] = json.dumps(v)
            else:
                stringified_data[k] = str(v)

    for token_record in tokens:
        token = token_record["fcm_token"]
        if firebase_app is not None:
            try:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body,
                    ),
                    data=stringified_data if stringified_data else None,
                    token=token,
                    android=messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            channel_id="elderguard_alarm_channel",
                            notification_priority="PRIORITY_MAX",
                            sound="default"
                        )
                    )
                )
                messaging.send(message)
                sent_count += 1
            except Exception as err:
                logger.warning(f"FCM Push failed for token {token[:10]}...: {err}")
                err_str = str(err).lower()
                if "unregistered" in err_str or "invalid" in err_str or "not-found" in err_str:
                    deactivate_device_token(token)
        else:
            # Mock mode sending
            logger.info(f"[MOCK FCM PUSH] Sent to User {user_id} (Token: {token[:10]}...): '{title}' - '{body}'")
            sent_count += 1

    if sent_count > 0:
        return {"success": True, "sent_count": sent_count}
    else:
        return {"success": False, "reason": "all_failed"}
