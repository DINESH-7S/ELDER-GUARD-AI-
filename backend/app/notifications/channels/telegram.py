import logging
from typing import Dict, Any, Optional
import httpx

from app.core.config import TELEGRAM_BOT_TOKEN
from app.core.database import supabase

logger = logging.getLogger("elderguard.notifications.telegram")

_mock_telegram_links_db: Dict[str, Dict[str, Any]] = {}


def get_active_telegram_link(user_id: str) -> Optional[Dict[str, Any]]:
    if supabase is not None:
        try:
            res = supabase.table("telegram_links").select("*").eq("user_id", user_id).eq("is_active", True).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass
    for link in _mock_telegram_links_db.values():
        if link.get("user_id") == user_id and link.get("is_active", True):
            return link
    return None


def deactivate_telegram_link(chat_id: str):
    if supabase is not None:
        try:
            supabase.table("telegram_links").update({"is_active": False}).eq("telegram_chat_id", chat_id).execute()
        except Exception:
            pass
    for link in _mock_telegram_links_db.values():
        if link.get("telegram_chat_id") == chat_id:
            link["is_active"] = False


def send_telegram_message(user_id: str, text: str) -> Dict[str, Any]:
    """
    Sends Telegram message to user via Telegram Bot API HTTP request.
    """
    link = get_active_telegram_link(user_id)
    if not link:
        return {"success": False, "reason": "not_linked"}

    chat_id = link["telegram_chat_id"]

    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN.startswith("123456789"):
        logger.info(f"[MOCK TELEGRAM MSG] Sent to User {user_id} (Chat ID: {chat_id}): '{text}'")
        return {"success": True}

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }

    try:
        response = httpx.post(url, json=payload, timeout=5.0)
        res_data = response.json()
        if response.status_code == 200 and res_data.get("ok"):
            return {"success": True}
        else:
            logger.warning(f"Telegram API call failed: {res_data}")
            # If bot was blocked or chat not found, deactivate link
            err_desc = res_data.get("description", "").lower()
            if "forbidden" in err_desc or "blocked" in err_desc or "not found" in err_desc:
                deactivate_telegram_link(chat_id)
            return {"success": False, "reason": res_data.get("description", "telegram_api_error")}
    except Exception as e:
        logger.error(f"Failed to post to Telegram API: {e}")
        return {"success": False, "reason": str(e)}
