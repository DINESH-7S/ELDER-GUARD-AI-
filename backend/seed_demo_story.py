"""Seeds the connected demo story on top of seed_connected_demo.py.

One family, all five portals:
  - Anaya Rao (elder) and Maya Rao (caregiver) are linked.
  - Dr. Rohan Mehta (doctor) has an upcoming telemedicine appointment with Anaya
    and has written two prescriptions addressed to GreenLeaf Pharmacy.
  - GreenLeaf Pharmacy (pharmacy) therefore sees both prescriptions in its queue.
  - City Care Hospital (hospital) has a profile for the dispatch desk.

All names, licence numbers and addresses here are fictional demo values.
Safe to run repeatedly.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.connected.storage import execute, fetch_one, new_id, now_iso
from app.doctor_records.routes import ensure_local_schema as ensure_clinical_schema

ELDER_ID = "demo-elder-001"
PHARMACY_NAME = "GreenLeaf Pharmacy"


def user_id_for(email: str) -> str:
    row = fetch_one("SELECT id FROM users WHERE email = :email", {"email": email})
    if not row:
        raise RuntimeError(f"Run seed_connected_demo first: no user {email}")
    return str(row["id"])


def upsert_profile(table: str, user_id: str, values: dict) -> None:
    """Insert the profile row, or bring an existing one up to the demo values."""
    stamp = now_iso()
    existing = fetch_one(f"SELECT user_id FROM {table} WHERE user_id = :id", {"id": user_id})
    if existing:
        assignments = ", ".join(f"{col} = :{col}" for col in values)
        execute(f"UPDATE {table} SET {assignments}, updated_at = :updated_at WHERE user_id = :user_id",
                {**values, "updated_at": stamp, "user_id": user_id})
    else:
        columns = ", ".join(["user_id", *values, "created_at", "updated_at"])
        placeholders = ", ".join([":user_id", *(f":{col}" for col in values), ":created_at", ":updated_at"])
        execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})",
                {**values, "user_id": user_id, "created_at": stamp, "updated_at": stamp})


def seed_story() -> None:
    ensure_clinical_schema()
    doctor_id = user_id_for("doctor.demo@elderguard.ai")
    hospital_id = user_id_for("hospital.demo@elderguard.ai")
    pharmacy_id = user_id_for("pharmacy.demo@elderguard.ai")

    upsert_profile("doctor_profiles", doctor_id, {
        "name": "Dr. Rohan Mehta",
        "professional_title": "Consultant Physician",
        "gender": "Male",
        "license_number": "DEMO-LIC-0001",
        "medical_council_board": "Demo Medical Council",
        "years_of_experience": 12,
        "specialization": "Internal Medicine",
        "qualification": "MBBS, MD (demo)",
        "working_hours": json.dumps({"Mon to Fri": "09:00-17:00"}),
    })
    upsert_profile("hospital_profiles", hospital_id, {
        "office_name": "City Care Hospital",
        "license_id": "DEMO-HOSP-01",
        "address": "12 Hospital Road",
        "phone_no": "+1555010",
    })
    upsert_profile("pharmacy_profiles", pharmacy_id, {
        "pharmacy_name": PHARMACY_NAME,
        "license_id": "DEMO-PH-01",
        "address": "8 Market Street",
        "phone_no": "+1555011",
        "home_delivery_available": 1,
    })

    # An upcoming telemedicine consultation puts Anaya on the doctor's roster.
    if not fetch_one("SELECT id FROM appointments WHERE doctor_id = :d AND elder_id = :e", {"d": doctor_id, "e": ELDER_ID}):
        day = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        stamp = now_iso()
        execute(
            """
            INSERT INTO appointments
            (id, elder_id, doctor_id, hospital_id, appointment_date, start_time, end_time, mode, status, queue_token, created_at, updated_at)
            VALUES (:id, :elder, :doctor, :hospital, :day, '10:30', '11:00', 'telemedicine', 'scheduled', 'Q-001', :now, :now)
            """,
            {"id": new_id(), "elder": ELDER_ID, "doctor": doctor_id, "hospital": hospital_id, "day": day, "now": stamp},
        )

    # Prescriptions addressed to the pharmacy by name: this is the doctor -> pharmacy handoff.
    for medicine, sig, duration, refills, meal, slot in [
        ("Metformin 500 mg", "1 tablet once daily with lunch", "30 days", 2, "With food", "13:00"),
        ("Atorvastatin 10 mg", "1 tablet at bedtime", "30 days", 2, "After food", "20:00"),
    ]:
        if fetch_one("SELECT id FROM doctor_prescriptions WHERE doctor_id = :d AND elder_id = :e AND medicine = :m",
                     {"d": doctor_id, "e": ELDER_ID, "m": medicine}):
            continue
        stamp = now_iso()
        execute(
            """
            INSERT INTO doctor_prescriptions
            (id, doctor_id, elder_id, patient, mrn, medicine, sig, duration, refills, pharmacy, status,
             time_slot, meal_timing, rx_type, instructions, created_at, updated_at)
            VALUES (:id, :doctor, :elder, 'Anaya Rao', 'EG-DEMO-001', :medicine, :sig, :duration, :refills, :pharmacy,
                    'Active (e-Signed)', :slot, :meal, 'text', 'Demo prescription', :now, :now)
            """,
            {"id": new_id(), "doctor": doctor_id, "elder": ELDER_ID, "medicine": medicine, "sig": sig,
             "duration": duration, "refills": refills, "pharmacy": PHARMACY_NAME, "slot": slot, "meal": meal, "now": stamp},
        )

    print("Seeded demo story: doctor profile + appointment, hospital and pharmacy profiles, 2 prescriptions to", PHARMACY_NAME)


if __name__ == "__main__":
    seed_story()
