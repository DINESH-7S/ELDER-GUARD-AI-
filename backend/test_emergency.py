import uuid
from datetime import datetime, timezone, timedelta

from app.emergency.schemas import SOSTriggerRequest, SOSResolveRequest
from app.emergency.models import SOSStatus, SOSLogAction
from app.emergency.service import (
    trigger_sos,
    acknowledge_sos,
    resolve_sos,
    get_active_sos,
    get_sos_history,
    get_escalation_policy,
    _mock_sos_events_db,
    _mock_sos_logs_db,
    _mock_elder_profiles,
    _mock_elder_caregiver_links,
)
from app.emergency.scheduler import escalation_sweep

print("==================================================================")
print("EMERGENCY SOS & ESCALATION SERVICE TEST SUITE")
print("==================================================================")

# Setup mock data for Elder & Linked Users
elder_id = str(uuid.uuid4())
caregiver_1_id = str(uuid.uuid4())
caregiver_2_id = str(uuid.uuid4())
hospital_id = str(uuid.uuid4())

_mock_elder_profiles[elder_id] = {
    "user_id": elder_id,
    "name": "Jane Elder",
    "phone_no": "+1-800-555-9999",
    "caregiver_id": caregiver_1_id,
    "primary_hospital_id": hospital_id
}

_mock_elder_caregiver_links.extend([
    {"elder_id": elder_id, "caregiver_id": caregiver_1_id},
    {"elder_id": elder_id, "caregiver_id": caregiver_2_id},
])

elder_user = {"user_id": elder_id, "role": "elder", "name": "Jane Elder"}
cg1_user = {"user_id": caregiver_1_id, "role": "caregiver", "name": "John Caregiver"}
cg2_user = {"user_id": caregiver_2_id, "role": "caregiver", "name": "Sarah Caregiver"}
hospital_user = {"user_id": hospital_id, "role": "hospital", "name": "City General Hospital"}

# ------------------------------------------------------------------
# STEP 1 & 2: Trigger SOS & Duplicate Prevention Test
# ------------------------------------------------------------------
print("\n--- STEP 1 & 2: Trigger SOS & Duplicate Prevention Test ---")

# Trigger SOS with GPS coordinates
event_1 = trigger_sos(
    elder_id=elder_id,
    location_lat=37.7749,
    location_lng=-122.4194,
    location_accuracy_m=12.5
)

print(f"SOS Triggered - Event ID: {event_1.id}")
assert event_1.status == SOSStatus.ACTIVE
assert event_1.current_escalation_tier == 1
assert event_1.location_lat == 37.7749
assert len(event_1.logs) >= 2, f"Expected at least 2 logs, got {len(event_1.logs)}"

log_actions = [l.action for l in event_1.logs]
assert SOSLogAction.TRIGGERED.value in log_actions, f"Missing 'triggered' log action: {log_actions}"
assert SOSLogAction.TIER_1_NOTIFIED.value in log_actions, f"Missing 'tier_1_notified' log action: {log_actions}"
print("[OK] Step 1 Passed: Event created with active status, tier 1, and initial log entries.")

# Duplicate Trigger Test (rapid button double press)
event_2 = trigger_sos(
    elder_id=elder_id,
    location_lat=37.7749,
    location_lng=-122.4194,
    location_accuracy_m=12.5
)
assert event_2.id == event_1.id, f"Expected duplicate trigger to return same event {event_1.id}, got {event_2.id}"
print("[OK] Step 2 Passed: Duplicate trigger returned existing active event ID (idempotency verified).")

# ------------------------------------------------------------------
# STEP 3: Escalation Sweep (Timed-Out Active Event -> Tier 2 Escalation)
# ------------------------------------------------------------------
print("\n--- STEP 3: Escalation Sweep Test (Tier 1 -> Tier 2) ---")

# Set triggered_at to 4 minutes in the past (Tier 2 timeout is 3 minutes)
past_time = (datetime.now(timezone.utc) - timedelta(minutes=4)).isoformat()
_mock_sos_events_db[event_1.id]["triggered_at"] = past_time

# Run background sweep
escalation_sweep()

updated_event = _mock_sos_events_db[event_1.id]
assert updated_event["current_escalation_tier"] == 2, f"Expected current_escalation_tier=2, got {updated_event['current_escalation_tier']}"

logs_after_sweep = [l for l in _mock_sos_logs_db if l.get("sos_event_id") == event_1.id]
sweep_log_actions = [l["action"] for l in logs_after_sweep]
assert "tier_2_escalated" in sweep_log_actions, f"Missing 'tier_2_escalated' in logs: {sweep_log_actions}"
print("[OK] Step 3 Passed: Timed-out active event escalated to Tier 2 with log entry.")

# ------------------------------------------------------------------
# STEP 4: Acknowledge SOS Test
# ------------------------------------------------------------------
print("\n--- STEP 4: Acknowledge SOS Test ---")

ack_event = acknowledge_sos(event_id=event_1.id, current_user=cg1_user)
assert ack_event.status == SOSStatus.ACKNOWLEDGED, f"Expected ACKNOWLEDGED, got {ack_event.status}"

ack_logs = [l.action for l in ack_event.logs]
assert SOSLogAction.ACKNOWLEDGED.value in ack_logs, f"Missing 'acknowledged' log action: {ack_logs}"
print("[OK] Step 4 Passed: Event status updated to ACKNOWLEDGED and responder notified.")

# ------------------------------------------------------------------
# STEP 5: Acknowledged Event Escalation Halt Test
# ------------------------------------------------------------------
print("\n--- STEP 5: Acknowledged Event Escalation Halt Test ---")

# Set triggered_at to 10 minutes in past (Tier 3 timeout is 5 minutes)
_mock_sos_events_db[event_1.id]["triggered_at"] = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()

# Run background sweep again
escalation_sweep()

halted_event = _mock_sos_events_db[event_1.id]
assert halted_event["current_escalation_tier"] == 2, f"Escalation should be halted at tier 2, but got {halted_event['current_escalation_tier']}"
print("[OK] Step 5 Passed: Escalation sweep correctly skipped ACKNOWLEDGED event.")

# ------------------------------------------------------------------
# STEP 6: Resolve SOS Test
# ------------------------------------------------------------------
print("\n--- STEP 6: Resolve SOS Test ---")

resolved_event = resolve_sos(
    event_id=event_1.id,
    current_user=hospital_user,
    resolution_note="Patient contacted. False alarm triggered by accident."
)

assert resolved_event.status == SOSStatus.RESOLVED, f"Expected RESOLVED, got {resolved_event.status}"
assert resolved_event.resolved_by == hospital_id
assert resolved_event.resolution_note == "Patient contacted. False alarm triggered by accident."
assert resolved_event.resolved_at is not None

res_logs = [l.action for l in resolved_event.logs]
assert SOSLogAction.RESOLVED.value in res_logs, f"Missing 'resolved' log action: {res_logs}"
print("[OK] Step 6 Passed: Event status updated to RESOLVED with resolution note & completion notice.")

# ------------------------------------------------------------------
# STEP 7: Get Active SOS & History Test
# ------------------------------------------------------------------
print("\n--- STEP 7: Active & History API Logic Test ---")

active_check = get_active_sos(elder_id)
assert active_check is None, f"Expected no active SOS for elder, got {active_check}"

history = get_sos_history(elder_id, elder_user)
assert len(history) >= 1, f"Expected at least 1 history event, got {len(history)}"
assert history[0].id == event_1.id
print("[OK] Step 7 Passed: Active check returns None and history contains completed event.")

# ------------------------------------------------------------------
# STEP 8: Escalation Policy Query Test
# ------------------------------------------------------------------
print("\n--- STEP 8: Escalation Policy Query Test ---")

policy = get_escalation_policy(elder_id)
assert len(policy) == 4, f"Expected 4 policy tiers, got {len(policy)}"
print(f"Retrieved Policy Tiers: {[f'Tier {p.tier_number}: {p.recipient_type} ({p.timeout_minutes}m)' for p in policy]}")
print("[OK] Step 8 Passed: Escalation policy retrieved successfully.")

# ------------------------------------------------------------------
# STEP 9: FastAPI HTTP Route Endpoint Test (via TestClient)
# ------------------------------------------------------------------
print("\n--- STEP 9: FastAPI HTTP Route Endpoint Test ---")
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user

client = TestClient(app)

# Create unique test users
http_elder_id = str(uuid.uuid4())
http_cg_id = str(uuid.uuid4())
_mock_elder_profiles[http_elder_id] = {
    "user_id": http_elder_id,
    "name": "HTTP Elder",
    "phone_no": "+19998887777",
    "caregiver_id": http_cg_id,
    "primary_hospital_id": hospital_id
}
_mock_elder_caregiver_links.append({"elder_id": http_elder_id, "caregiver_id": http_cg_id})

# Mock auth dependency for elder
app.dependency_overrides[get_current_user] = lambda: {"user_id": http_elder_id, "role": "elder", "name": "HTTP Elder"}

# 1. Trigger via HTTP POST
resp = client.post("/emergency/trigger", json={"location_lat": 12.9716, "location_lng": 77.5946, "location_accuracy_m": 5.0})
assert resp.status_code == 201, f"Trigger failed: {resp.text}"
http_event = resp.json()
http_event_id = http_event["id"]
print(f"[OK] POST /emergency/trigger returned 201. Event ID: {http_event_id}")

# 2. Get Active via HTTP GET
resp_active = client.get(f"/emergency/active/{http_elder_id}")
assert resp_active.status_code == 200
assert resp_active.json()["id"] == http_event_id
print(f"[OK] GET /emergency/active/{http_elder_id} returned 200 with active event.")

# 3. Acknowledge via HTTP PUT (switch override to caregiver)
app.dependency_overrides[get_current_user] = lambda: {"user_id": http_cg_id, "role": "caregiver", "name": "HTTP Caregiver"}
resp_ack = client.put(f"/emergency/{http_event_id}/acknowledge")
assert resp_ack.status_code == 200
assert resp_ack.json()["status"] == "acknowledged"
print(f"[OK] PUT /emergency/{http_event_id}/acknowledge returned 200.")

# 4. Resolve via HTTP PUT
resp_res = client.put(f"/emergency/{http_event_id}/resolve", json={"resolution_note": "HTTP test resolved."})
assert resp_res.status_code == 200
assert resp_res.json()["status"] == "resolved"
assert resp_res.json()["resolution_note"] == "HTTP test resolved."
print(f"[OK] PUT /emergency/{http_event_id}/resolve returned 200.")

# 5. History & Escalation Policy via HTTP GET
resp_hist = client.get(f"/emergency/history/{http_elder_id}")
assert resp_hist.status_code == 200
assert len(resp_hist.json()) >= 1
print(f"[OK] GET /emergency/history/{http_elder_id} returned 200.")

resp_pol = client.get(f"/emergency/escalation-policy/{http_elder_id}")
assert resp_pol.status_code == 200
assert len(resp_pol.json()) == 4
print(f"[OK] GET /emergency/escalation-policy/{http_elder_id} returned 200.")

# Clean up dependency override
app.dependency_overrides.clear()

print("\n==================================================================")
print("ALL EMERGENCY SOS & ESCALATION SERVICE TESTS PASSED SUCCESSFULLY!")
print("==================================================================")

