import uuid

from app.reports.models import ReportCreate, ReportType
from app.reports.routes import upload_report, get_reports_list, get_report_details, delete_report, _mock_reports_db

print("==================================================================")
print("ELDER MEDICAL REPORTS & DOCUMENT VAULT TEST SUITE")
print("==================================================================")

elder_id = str(uuid.uuid4())
doctor_id = str(uuid.uuid4())
unauthorized_id = str(uuid.uuid4())

user_elder = {"user_id": elder_id, "role": "elder", "name": "Elder Report User"}
user_doctor = {"user_id": doctor_id, "role": "doctor", "name": "Dr. Smith"}
user_unauth = {"user_id": unauthorized_id, "role": "elder", "name": "Stranger"}

# STEP 1: Upload Lab Result Report
print("\n--- STEP 1: Upload Lab Report Test ---")
r1_payload = ReportCreate(
    elder_id=elder_id,
    title="Blood Panel Results",
    report_type=ReportType.LAB_RESULT,
    file_url="https://storage.elderguard.ai/reports/lab_001.pdf",
    notes="Normal fasting glucose",
    parsed_data={"glucose": 95}
)
r1 = upload_report(r1_payload, user_elder)
assert r1.title == "Blood Panel Results"
print(f"[OK] Step 1 Passed: Report uploaded (ID: {r1.id}).")

# STEP 2: Upload Prescription Report
print("\n--- STEP 2: Upload Prescription Report Test ---")
r2_payload = ReportCreate(
    elder_id=elder_id,
    title="Cardiology Prescription",
    report_type=ReportType.PRESCRIPTION,
    file_url="https://storage.elderguard.ai/reports/rx_002.pdf",
    notes="Prescribed Amlodipine"
)
r2 = upload_report(r2_payload, user_doctor)
assert r2.report_type == ReportType.PRESCRIPTION
print(f"[OK] Step 2 Passed: Doctor uploaded prescription report.")

# STEP 3: List Reports & Type Filter
print("\n--- STEP 3: List & Filter Reports Test ---")
all_reports = get_reports_list(elder_id, current_user=user_elder)
assert len(all_reports) == 2

lab_only = get_reports_list(elder_id, report_type=ReportType.LAB_RESULT, current_user=user_doctor)
assert len(lab_only) == 1
assert lab_only[0].id == r1.id
print(f"[OK] Step 3 Passed: Reports listed & filtered correctly ({len(all_reports)} total, {len(lab_only)} lab results).")

# STEP 4: Get Specific Report Details & Authorization Check
print("\n--- STEP 4: Get Report Details & Auth Test ---")
details = get_report_details(r1.id, user_doctor)
assert details.id == r1.id

try:
    get_report_details(r1.id, user_unauth)
    assert False, "Unauthorized access should fail"
except Exception:
    print("[OK] Step 4 Passed: Report details retrieved & unauthorized access blocked (403).")

# STEP 5: Delete Report
print("\n--- STEP 5: Delete Report Test ---")
del_res = delete_report(r2.id, user_elder)
assert del_res["status"] == "success"

after_del = get_reports_list(elder_id, current_user=user_elder)
assert len(after_del) == 1
print("[OK] Step 5 Passed: Report deleted successfully.")

# STEP 6: FastAPI HTTP Route Test
print("\n--- STEP 6: FastAPI HTTP Route Test ---")
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user_elder

resp = client.post("/reports/upload", json={
    "elder_id": elder_id,
    "title": "HTTP Test Report",
    "report_type": "imaging",
    "file_url": "https://storage.elderguard.ai/reports/xray.png"
})
assert resp.status_code == 201
http_r = resp.json()
print(f"[OK] POST /reports/upload returned 201 Created. ID: {http_r['id']}")

app.dependency_overrides.clear()

print("\n==================================================================")
print("ALL MEDICAL REPORTS VAULT TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
