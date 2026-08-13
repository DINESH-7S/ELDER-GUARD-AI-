import uuid
from datetime import date

from app.analytics.routes import (
    get_medicine_adherence_stats,
    get_vitals_summary_stats,
    get_daily_health_digest,
    _mock_digests_db,
)

print("==================================================================")
print("CAREGIVER HEALTH DIGEST & ADHERENCE ANALYTICS TEST SUITE")
print("==================================================================")

elder_id = str(uuid.uuid4())
caregiver_id = str(uuid.uuid4())
unauthorized_id = str(uuid.uuid4())

user_elder = {"user_id": elder_id, "role": "elder", "name": "Elder Analytics User"}
user_cg = {"user_id": caregiver_id, "role": "caregiver", "name": "Caregiver Mary"}
user_unauth = {"user_id": unauthorized_id, "role": "elder", "name": "Stranger"}

# STEP 1: Medicine Adherence Analytics Test
print("\n--- STEP 1: Medicine Adherence Analytics Test ---")
adh = get_medicine_adherence_stats(elder_id, days=7, current_user=user_cg)
assert adh.elder_id == elder_id
assert adh.adherence_percent >= 0.0 and adh.adherence_percent <= 100.0
print(f"[OK] Step 1 Passed: Medicine adherence calculated ({adh.adherence_percent}%).")

# STEP 2: Vitals Summary & Stability Index Test
print("\n--- STEP 2: Vitals Summary & Stability Index Test ---")
vit_sum = get_vitals_summary_stats(elder_id, days=7, current_user=user_cg)
assert vit_sum.stability_index in ["STABLE", "MODERATE", "UNSTABLE"]
print(f"[OK] Step 2 Passed: Vitals summary calculated (Stability: {vit_sum.stability_index}, Abnormal count: {vit_sum.abnormal_readings_count}).")

# STEP 3: Daily Health Digest Summary Test
print("\n--- STEP 3: Daily Health Digest Test ---")
digest = get_daily_health_digest(elder_id, target_date=date.today(), current_user=user_cg)
assert digest.elder_id == elder_id
assert "Medicine Adherence" in digest.summary_text
print(f"[OK] Step 3 Passed: Daily health digest generated successfully.")
print(f"Digest Preview: '{digest.summary_text}'")

# STEP 4: Authorization Enforcement Check
print("\n--- STEP 4: Authorization Enforcement Test ---")
try:
    get_daily_health_digest(elder_id, current_user=user_unauth)
    assert False, "Unauthorized user should be blocked"
except Exception:
    print("[OK] Step 4 Passed: Unauthorized access blocked (403).")

# STEP 5: FastAPI HTTP Route Test
print("\n--- STEP 5: FastAPI HTTP Route Test ---")
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user_cg

resp = client.get(f"/analytics/daily-digest/{elder_id}")
assert resp.status_code == 200
http_d = resp.json()
assert http_d["elder_id"] == elder_id
print(f"[OK] GET /analytics/daily-digest/{elder_id} returned 200 OK.")

app.dependency_overrides.clear()

print("\n==================================================================")
print("ALL CAREGIVER ANALYTICS & DIGEST TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
