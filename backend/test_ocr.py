import uuid
from datetime import date

from app.ocr.models import PrescriptionScanRequest, ReportScanRequest
from app.ocr.routes import scan_prescription, scan_lab_report, get_ocr_scan_history, _mock_ocr_scans_db
from app.medicines.service import get_medicines_for_elder

print("==================================================================")
print("OCR MEDICAL DOCUMENT & PRESCRIPTION PROCESSOR TEST SUITE")
print("==================================================================")

elder_id = str(uuid.uuid4())
user_elder = {"user_id": elder_id, "role": "elder", "name": "Elder OCR User"}

# STEP 1: Prescription Scan & Medicine Auto-Creation Test
print("\n--- STEP 1: Prescription Scan & Auto-Creation Test ---")
px_payload = PrescriptionScanRequest(
    elder_id=elder_id,
    sample_text="Metformin 500mg 08:00, 20:00\nAmlodipine 5mg 09:00",
    auto_create_medicines=True
)
px_res = scan_prescription(px_payload, user_elder)
assert px_res.auto_created_count >= 1
assert len(px_res.medicines) >= 1
print(f"[OK] Step 1 Passed: Prescription scanned ({len(px_res.medicines)} meds extracted, {px_res.auto_created_count} auto-created).")

# STEP 2: Verify Medicines Created in Medicine Service
print("\n--- STEP 2: Verify Medicines Created in Medicine Service ---")
meds = get_medicines_for_elder(elder_id, user_elder)
assert len(meds) >= 1
print(f"[OK] Step 2 Passed: Scanned medicines confirmed in Medicine Management service ({len(meds)} active meds).")

# STEP 3: Lab Report OCR Scan Test
print("\n--- STEP 3: Lab Report OCR Scan Test ---")
rep_payload = ReportScanRequest(
    elder_id=elder_id,
    sample_text="Blood Glucose: 110.5 mg/dL\nTotal Cholesterol: 185.0 mg/dL\nHemoglobin: 14.2 g/dL"
)
rep_res = scan_lab_report(rep_payload, user_elder)
assert "blood_sugar_mg_dl" in rep_res.lab_values
assert rep_res.lab_values["blood_sugar_mg_dl"] == 110.5
print(f"[OK] Step 3 Passed: Lab report scanned & metrics extracted: {rep_res.lab_values}")

# STEP 4: Scan History Query
print("\n--- STEP 4: Scan History Query Test ---")
history = get_ocr_scan_history(elder_id, user_elder)
assert len(history) == 2
print(f"[OK] Step 4 Passed: OCR scan history retrieved ({len(history)} scans).")

# STEP 5: FastAPI HTTP Route Endpoint Test
print("\n--- STEP 5: FastAPI HTTP Route Endpoint Test ---")
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user_elder

resp_px = client.post("/ocr/scan-prescription", json={"elder_id": elder_id, "sample_text": "Aspirin 81mg 08:00"})
assert resp_px.status_code == 200
assert resp_px.json()["auto_created_count"] >= 1
print("[OK] Step 5 Passed: POST /ocr/scan-prescription returned 200 OK.")

app.dependency_overrides.clear()

print("\n==================================================================")
print("ALL OCR PROCESSOR TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
