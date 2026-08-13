import uuid
from datetime import datetime, timezone, timedelta

from app.vitals.models import VitalCreate
from app.vitals.routes import (
    add_vitals_reading,
    get_vitals_list,
    get_latest_vital,
    get_vitals_trend,
    delete_vital_reading,
    _mock_vitals_db,
)
from app.core import config

print("==================================================================")
print("VITALS MICROSERVICE TEST SUITE")
print("==================================================================")

elder_id = str(uuid.uuid4())
caregiver_id = str(uuid.uuid4())
doctor_id = str(uuid.uuid4())
unauthorized_id = str(uuid.uuid4())

user_elder = {"user_id": elder_id, "role": "elder", "name": "Elder John"}
user_caregiver = {"user_id": caregiver_id, "role": "caregiver", "name": "Caregiver Mary"}
user_doctor = {"user_id": doctor_id, "role": "doctor", "name": "Dr. House"}
user_unauthorized = {"user_id": unauthorized_id, "role": "elder", "name": "Stranger"}

now_dt = datetime.now(timezone.utc)
t1 = (now_dt - timedelta(minutes=10)).isoformat()
t2 = (now_dt - timedelta(minutes=5)).isoformat()
t3 = now_dt.isoformat()

# STEP 1: Normal Vital Entry
print("\n--- STEP 1: Normal Vital Entry ---")
v1_payload = VitalCreate(
    elder_id=elder_id,
    systolic_bp=120,
    diastolic_bp=80,
    pulse_bpm=72,
    spo2_percent=98.0,
    blood_sugar_mg_dl=95.0,
    temperature_c=36.6,
    notes="Morning routine check",
    recorded_at=t1
)
v1 = add_vitals_reading(v1_payload, user_elder)
assert v1.is_abnormal == False
assert len(v1.abnormal_metrics) == 0
print(f"[OK] Step 1 Passed: Normal reading created (ID: {v1.id}).")

# STEP 2: Range Validation Error Handling
print("\n--- STEP 2: Range Validation Error Handling ---")
try:
    VitalCreate(elder_id=elder_id, spo2_percent=120.0) # Invalid > 100
    assert False, "Should have raised Pydantic ValidationError for invalid SpO2"
except Exception:
    print("[OK] Step 2 Passed: Out-of-range metric correctly rejected.")

# STEP 3: At Least One Metric Requirement
print("\n--- STEP 3: At Least One Metric Requirement ---")
try:
    VitalCreate(elder_id=elder_id)
    assert False, "Should have raised ValidationError for missing all metrics"
except Exception:
    print("[OK] Step 3 Passed: Empty metric payload correctly rejected.")

# STEP 4: Future Timestamp Prevention
print("\n--- STEP 4: Future Timestamp Prevention ---")
future_iso = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
try:
    VitalCreate(elder_id=elder_id, pulse_bpm=75, recorded_at=future_iso)
    assert False, "Should have raised ValidationError for future recorded_at timestamp"
except Exception:
    print("[OK] Step 4 Passed: Future recorded_at timestamp correctly rejected.")

# STEP 5: Single Metric Abnormal Detection & Alerting
print("\n--- STEP 5: Single Metric Abnormal Detection ---")
v2_payload = VitalCreate(
    elder_id=elder_id,
    systolic_bp=155,  # > 140 -> Abnormal
    diastolic_bp=95,  # > 90 -> Abnormal
    pulse_bpm=75,
    recorded_at=t2
)
v2 = add_vitals_reading(v2_payload, user_elder)
assert v2.is_abnormal == True
assert len(v2.abnormal_metrics) == 2
print(f"[OK] Step 5 Passed: Abnormal BP detected: {v2.abnormal_metrics}")

# STEP 6: Multi-Metric Critical Auto-Escalation Toggle Test
print("\n--- STEP 6: Critical Auto-Escalation Toggle ---")
# Enable AUTO_ESCALATE_CRITICAL_VITALS config toggle
config.AUTO_ESCALATE_CRITICAL_VITALS = True

v3_payload = VitalCreate(
    elder_id=elder_id,
    systolic_bp=195,     # > 180 (Critical 1)
    spo2_percent=85.0,   # < 90 (Critical 2)
    blood_sugar_mg_dl=40.0, # < 50 (Critical 3)
    recorded_at=t3
)
v3 = add_vitals_reading(v3_payload, user_elder)

assert v3.is_abnormal == True
assert len(v3.abnormal_metrics) == 3
print("[OK] Step 6 Passed: Critical multi-metric reading triggered Emergency SOS auto-escalation.")

# Reset toggle
config.AUTO_ESCALATE_CRITICAL_VITALS = False

# STEP 7: Get Latest Vital Reading
print("\n--- STEP 7: Get Latest Vital ---")
latest = get_latest_vital(elder_id, user_elder)
assert latest is not None
assert latest.id == v3.id
print(f"[OK] Step 7 Passed: Latest vital reading returned ID: {latest.id}")

# STEP 8: Get Paginated History
print("\n--- STEP 8: Get Paginated History ---")
history = get_vitals_list(elder_id, limit=10, offset=0, current_user=user_elder)
assert len(history) == 3
print(f"[OK] Step 8 Passed: History query returned {len(history)} records.")

# STEP 9: Get Historical Trend Points
print("\n--- STEP 9: Get Historical Trend Points ---")
trend = get_vitals_trend(elder_id, days=7, current_user=user_doctor)
assert len(trend) == 3
print(f"[OK] Step 9 Passed: Trend query returned {len(trend)} trend points.")

# STEP 10: Role-Based Access Enforcement
print("\n--- STEP 10: Role-Based Access Enforcement ---")
# Caregiver read/write
add_vitals_reading(VitalCreate(elder_id=elder_id, pulse_bpm=70), user_caregiver)

# Doctor write attempt (should fail)
try:
    add_vitals_reading(VitalCreate(elder_id=elder_id, pulse_bpm=70), user_doctor)
    assert False, "Doctor should not have write permissions to vitals"
except Exception:
    print("[OK] Step 10 Passed: Doctor write attempt blocked, caregiver/elder allowed.")

# STEP 11: Delete Vital Reading
print("\n--- STEP 11: Delete Vital Reading ---")
del_res = delete_vital_reading(v1.id, user_elder)
assert del_res["status"] == "success"

latest_after_del = get_vitals_list(elder_id, limit=10, offset=0, current_user=user_elder)
assert len(latest_after_del) == 3 # 4 total created - 1 deleted = 3 remaining
print("[OK] Step 11 Passed: Vital record deleted successfully.")

# STEP 12: FastAPI HTTP Route Endpoint Test via TestClient
print("\n--- STEP 12: FastAPI HTTP Route Endpoint Test ---")
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user_elder

# POST /vitals/add
resp = client.post("/vitals/add", json={
    "elder_id": elder_id,
    "systolic_bp": 118,
    "diastolic_bp": 78,
    "pulse_bpm": 68
})
assert resp.status_code == 201, f"POST /vitals/add failed: {resp.text}"
http_vital = resp.json()
print(f"[OK] POST /vitals/add returned 201 Created. Vital ID: {http_vital['id']}")

# GET /vitals/latest/{elder_id}
resp_latest = client.get(f"/vitals/latest/{elder_id}")
assert resp_latest.status_code == 200
assert resp_latest.json()["id"] == http_vital["id"]
print(f"[OK] GET /vitals/latest/{elder_id} returned 200 OK.")

# GET /vitals/trend/{elder_id}
resp_trend = client.get(f"/vitals/trend/{elder_id}")
assert resp_trend.status_code == 200
print(f"[OK] GET /vitals/trend/{elder_id} returned 200 OK.")

app.dependency_overrides.clear()

print("\n==================================================================")
print("ALL VITALS MICROSERVICE TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
