import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.connected.storage import dumps, execute, fetch_one, initialize_connected_schema, new_id, now_iso
from app.core.security import hash_password


ELDER_ID = "demo-elder-001"
CAREGIVER_ID = "demo-caregiver-001"


def upsert_user(user_id: str, email: str, role: str, phone_no: str) -> None:
    existing = fetch_one("SELECT id FROM users WHERE id = :id OR email = :email", {"id": user_id, "email": email})
    timestamp = now_iso()
    if existing:
        return
    execute(
        """
        INSERT INTO users (id, email, phone_no, password_hash, auth_provider, google_id, role, is_verified, created_at, updated_at)
        VALUES (:id, :email, :phone_no, :password_hash, 'email', NULL, :role, 1, :created_at, :updated_at)
        """,
        {
            "id": user_id,
            "email": email,
            "phone_no": phone_no,
            "password_hash": hash_password("DemoPass123!"),
            "role": role,
            "created_at": timestamp,
            "updated_at": timestamp,
        },
    )


def seed() -> None:
    initialize_connected_schema()
    upsert_user(ELDER_ID, "elder.demo@elderguard.ai", "elder", "+1555001")
    upsert_user(CAREGIVER_ID, "caregiver.demo@elderguard.ai", "caregiver", "+1555002")
    upsert_user("demo-doctor-001", "doctor.demo@elderguard.ai", "doctor", "+1555003")
    upsert_user("demo-hospital-001", "hospital.demo@elderguard.ai", "hospital", "+1555004")
    upsert_user("demo-pharmacy-001", "pharmacy.demo@elderguard.ai", "pharmacy", "+1555005")

    timestamp = now_iso()
    if not fetch_one("SELECT user_id FROM elder_profiles WHERE user_id = :id", {"id": ELDER_ID}):
        execute(
            """
            INSERT INTO elder_profiles
            (user_id, elder_id, profile_pic_url, name, nickname, age_or_dob, gender, blood_group, primary_language, phone_no, whatsapp_no, email, home_address, height_cm, weight_kg, bed_gap, caregiver_id, created_at, updated_at)
            VALUES (:user_id, 'EG-DEMO-001', NULL, 'Anaya Rao', 'Anaya', '1949-03-12', 'Female', 'O+', 'English', '+1555001', '+1555001', 'elder.demo@elderguard.ai', '42 Lotus Avenue', 158, 62, 'Normal', :caregiver_id, :created_at, :updated_at)
            """,
            {"user_id": ELDER_ID, "caregiver_id": CAREGIVER_ID, "created_at": timestamp, "updated_at": timestamp},
        )

    if not fetch_one("SELECT user_id FROM caregiver_profiles WHERE user_id = :id", {"id": CAREGIVER_ID}):
        execute(
            """
            INSERT INTO caregiver_profiles
            (user_id, name, phone_no, email, relationship_to_elder, linked_elder_id, profile_pic_url, created_at, updated_at)
            VALUES (:user_id, 'Maya Rao', '+1555002', 'caregiver.demo@elderguard.ai', 'Daughter', :elder_id, NULL, :created_at, :updated_at)
            """,
            {"user_id": CAREGIVER_ID, "elder_id": ELDER_ID, "created_at": timestamp, "updated_at": timestamp},
        )

    if not fetch_one("SELECT id FROM elder_caregiver_links WHERE elder_id = :elder AND caregiver_id = :caregiver", {"elder": ELDER_ID, "caregiver": CAREGIVER_ID}):
        execute(
            """
            INSERT INTO elder_caregiver_links
            (id, elder_id, caregiver_id, permission_level, status, invited_by, invited_at, accepted_at, created_at, updated_at)
            VALUES (:id, :elder_id, :caregiver_id, 'full_access', 'active', :caregiver_id, :now, :now, :now, :now)
            """,
            {"id": new_id(), "elder_id": ELDER_ID, "caregiver_id": CAREGIVER_ID, "now": timestamp},
        )

    if not fetch_one("SELECT id FROM connected_medicines WHERE elder_id = :elder LIMIT 1", {"elder": ELDER_ID}):
        for name, dosage, times, instructions, stock in [
            ("Aspirin", "81 mg", ["08:00"], "Take after breakfast with water", 6),
            ("Metformin", "500 mg", ["13:00"], "Take with lunch", 22),
            ("Atorvastatin", "10 mg", ["20:00"], "Take before bedtime", 18),
        ]:
            med_id = new_id()
            execute(
                """
                INSERT INTO connected_medicines
                (id, elder_id, name, dosage, frequency, scheduled_times, instructions, stock_count, low_stock_threshold, is_active, added_by, performed_by, created_at, updated_at)
                VALUES (:id, :elder_id, :name, :dosage, 'daily', :times, :instructions, :stock, 7, 1, :caregiver, :caregiver, :now, :now)
                """,
                {"id": med_id, "elder_id": ELDER_ID, "name": name, "dosage": dosage, "times": dumps(times), "instructions": instructions, "stock": stock, "caregiver": CAREGIVER_ID, "now": timestamp},
            )

    if not fetch_one("SELECT id FROM connected_vitals WHERE elder_id = :elder LIMIT 1", {"elder": ELDER_ID}):
        for days_ago, systolic, diastolic, pulse in [(6, 128, 80, 74), (3, 132, 84, 78), (1, 126, 79, 72)]:
            recorded = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
            execute(
                """
                INSERT INTO connected_vitals (id, elder_id, type, value, unit, recorded_at, source, flagged, created_at)
                VALUES (:id, :elder_id, 'bp', :value, 'mmHg', :recorded_at, 'manual', 0, :created_at)
                """,
                {"id": new_id(), "elder_id": ELDER_ID, "value": dumps({"systolic": systolic, "diastolic": diastolic, "value": systolic}), "recorded_at": recorded, "created_at": recorded},
            )
            execute(
                """
                INSERT INTO connected_vitals (id, elder_id, type, value, unit, recorded_at, source, flagged, created_at)
                VALUES (:id, :elder_id, 'heart_rate', :value, 'bpm', :recorded_at, 'manual', 0, :created_at)
                """,
                {"id": new_id(), "elder_id": ELDER_ID, "value": dumps({"value": pulse}), "recorded_at": recorded, "created_at": recorded},
            )

    if not fetch_one("SELECT id FROM connected_sos_events WHERE elder_id = :elder LIMIT 1", {"elder": ELDER_ID}):
        triggered = (datetime.now(timezone.utc) - timedelta(days=12)).isoformat()
        execute(
            """
            INSERT INTO connected_sos_events
            (id, elder_id, triggered_at, location, status, caregiver_notified_at, resolved_by, resolution_notes, created_at, updated_at)
            VALUES (:id, :elder_id, :triggered_at, :location, 'resolved', :triggered_at, :caregiver_id, 'Demo past SOS resolved by caregiver.', :triggered_at, :triggered_at)
            """,
            {"id": new_id(), "elder_id": ELDER_ID, "triggered_at": triggered, "location": dumps({"lat": 37.7749, "lng": -122.4194}), "caregiver_id": CAREGIVER_ID},
        )

    from seed_demo_story import seed_story
    seed_story()

    print("Seeded connected ElderGuard demo accounts:")
    print("  elder.demo@elderguard.ai / DemoPass123!")
    print("  caregiver.demo@elderguard.ai / DemoPass123!")
    print("  doctor.demo@elderguard.ai / DemoPass123!")
    print("  hospital.demo@elderguard.ai / DemoPass123!")
    print("  pharmacy.demo@elderguard.ai / DemoPass123!")


if __name__ == "__main__":
    seed()
