import uuid
import time
import httpx

from app.notifications.channels.in_app import deliver_in_app, _mock_notifications_db
from app.notifications.channels.push_fcm import send_push, _mock_device_tokens_db
from app.notifications.channels.telegram import send_telegram_message, _mock_telegram_links_db
from app.notifications.service import send_alarm_trigger, send_alert, send_notification
from app.core.security import create_jwt_token

print("==================================================================")
print("TEST 1: In-App Direct Delivery (deliver_in_app)")
print("==================================================================")

user_id = str(uuid.uuid4())
row = deliver_in_app(
    recipient_id=user_id,
    type="info",
    title="Welcome to ElderGuard AI",
    body="Your account has been successfully created.",
    payload={"welcome": True},
    priority="normal"
)

print("[OK] In-App Notification Created:", row["id"])
assert row["recipient_id"] == user_id
assert row["delivered_via"] == ["in_app"]


print("\n==================================================================")
print("TEST 2: FCM Device Token Registration & Push")
print("==================================================================")

# Register device token for user
fcm_token_str = f"fcm_token_test_{int(time.time())}"
_mock_device_tokens_db[fcm_token_str] = {
    "id": str(uuid.uuid4()),
    "user_id": user_id,
    "fcm_token": fcm_token_str,
    "device_type": "android",
    "is_active": True
}

push_res = send_push(user_id=user_id, title="Test Push", body="Testing FCM notification")
print("[OK] Push FCM Result:", push_res)
assert push_res["success"] == True
assert push_res["sent_count"] == 1


print("\n==================================================================")
print("TEST 3: Telegram Linking & Messaging")
print("==================================================================")

chat_id_str = f"chat_{int(time.time())}"
_mock_telegram_links_db[chat_id_str] = {
    "id": str(uuid.uuid4()),
    "user_id": user_id,
    "telegram_chat_id": chat_id_str,
    "telegram_username": "test_user_tg",
    "is_active": True
}

tg_res = send_telegram_message(user_id=user_id, text="Hello from ElderGuard AI Bot!")
print("[OK] Telegram Result:", tg_res)
assert tg_res["success"] == True


print("\n==================================================================")
print("TEST 4: Core Service Functions (send_alarm_trigger, send_alert, send_notification)")
print("==================================================================")

# 4a. Alarm Trigger (In-App + Push, No Telegram)
alarm_res = send_alarm_trigger(
    elder_id=user_id,
    session_id=str(uuid.uuid4()),
    title="Medicine Reminder",
    body="Time for: Metformin 500mg",
    medicines=[{"name": "Metformin", "dosage": "500mg"}]
)
print("[OK] Alarm Trigger Result:", alarm_res)
assert "in_app" in alarm_res["delivered_via"]
assert "push" in alarm_res["delivered_via"]
assert "telegram" not in alarm_res["delivered_via"]

# 4b. Alert (In-App + Push + Telegram)
alert_res = send_alert(
    recipient_id=user_id,
    message="Emergency SOS Alert: Fall detected in bedroom!",
    priority="high"
)
print("[OK] Alert Result:", alert_res)
assert "in_app" in alert_res["delivered_via"]
assert "push" in alert_res["delivered_via"]
assert "telegram" in alert_res["delivered_via"]

# 4c. General Notification (Info: In-App only)
info_res = send_notification(
    recipient_id=user_id,
    title="Appointment Confirmed",
    body="Dr. Smith consultation confirmed for tomorrow 10:00 AM",
    type="info",
    priority="normal"
)
print("[OK] Info Notification Result:", info_res)
assert info_res["delivered_via"] == ["in_app"]


print("\n==================================================================")
print("ALL NOTIFICATION SERVICE TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
