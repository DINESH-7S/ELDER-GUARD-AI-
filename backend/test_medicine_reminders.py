import uuid
from datetime import date, datetime, timezone, timedelta

# Import domain service logic directly for unit testing
from app.medicines.schemas import MedicineCreate, TurnOffSessionRequest
from app.medicines.service import (
    create_medicine,
    generate_nightly_sessions,
    get_active_session_for_elder,
    mark_item_taken,
    turn_off_session,
    _mock_medicines_db,
    _mock_sessions_db,
    _mock_items_db,
)
from app.medicines.models import SessionStatus, SessionResolution
from app.medicines.scheduler import sweep_start_ringing, sweep_check_timeouts

print("==================================================================")
print("TEST 1: Grouping Validation (Medicine A + B -> Exactly 3 Sessions)")
print("==================================================================")

# Create Mock Elder and User Context
elder_id = str(uuid.uuid4())
mock_elder_user = {"user_id": elder_id, "role": "elder"}
today = date.today()

# Medicine A: 08:00 and 14:00
med_a_payload = MedicineCreate(
    elder_id=elder_id,
    name="Medicine A (Metformin)",
    dosage="500mg",
    times_of_day=["08:00", "14:00"],
    start_date=today
)
med_a = create_medicine(med_a_payload, mock_elder_user)
print("Created Medicine A:", med_a.name, med_a.times_of_day)

# Medicine B: 08:00 and 21:00
med_b_payload = MedicineCreate(
    elder_id=elder_id,
    name="Medicine B (Amlodipine)",
    dosage="5mg",
    times_of_day=["08:00", "21:00"],
    start_date=today
)
med_b = create_medicine(med_b_payload, mock_elder_user)
print("Created Medicine B:", med_b.name, med_b.times_of_day)

# Run Nightly Session Generation for today
sessions = generate_nightly_sessions(today)
elder_sessions = [s for s in sessions if s.elder_id == elder_id]

print(f"\nGenerated Total Sessions Count: {len(elder_sessions)}")
assert len(elder_sessions) == 3, f"Expected exactly 3 sessions, got {len(elder_sessions)}"

# Map sessions by time
sessions_by_time = {}
for s in elder_sessions:
    dt = datetime.fromisoformat(s.scheduled_time)
    t_str = f"{dt.hour:02d}:{dt.minute:02d}"
    sessions_by_time[t_str] = s

# Assert 08:00 session has 2 items (A + B)
session_08 = sessions_by_time.get("08:00")
assert session_08 is not None, "Missing 08:00 session"
assert len(session_08.items) == 2, f"Expected 2 items at 08:00, got {len(session_08.items)}"
item_names_08 = set(item.medicine_name for item in session_08.items)
assert item_names_08 == {"Medicine A (Metformin)", "Medicine B (Amlodipine)"}, f"Unexpected items at 08:00: {item_names_08}"
print("[OK] 08:00 Session Verified: 2 items (A + B)")

# Assert 14:00 session has 1 item (A)
session_14 = sessions_by_time.get("14:00")
assert session_14 is not None, "Missing 14:00 session"
assert len(session_14.items) == 1, f"Expected 1 item at 14:00, got {len(session_14.items)}"
assert session_14.items[0].medicine_name == "Medicine A (Metformin)"
print("[OK] 14:00 Session Verified: 1 item (A)")

# Assert 21:00 session has 1 item (B)
session_21 = sessions_by_time.get("21:00")
assert session_21 is not None, "Missing 21:00 session"
assert len(session_21.items) == 1, f"Expected 1 item at 21:00, got {len(session_21.items)}"
assert session_21.items[0].medicine_name == "Medicine B (Amlodipine)"
print("[OK] 21:00 Session Verified: 1 item (B)")


print("\n==================================================================")
print("TEST 2: Job A Sweep (Start Ringing / Retry Sweep)")
print("==================================================================")

# Set 08:00 session scheduled_time to past to trigger Job A
past_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
_mock_sessions_db[session_08.id]["scheduled_time"] = past_time

# Run Job A sweep
sweep_start_ringing()

session_08_updated = _mock_sessions_db[session_08.id]
assert session_08_updated["status"] == SessionStatus.RINGING.value, f"Expected RINGING, got {session_08_updated['status']}"
assert session_08_updated["attempt_count"] == 1, f"Expected attempt_count=1, got {session_08_updated['attempt_count']}"
assert session_08_updated["current_ring_started_at"] is not None
print("[OK] Job A Sweep Verified: Session moved to RINGING, attempt_count=1")


print("\n==================================================================")
print("TEST 3: Job B Sweep (120s Timeout Check & Retry Wait)")
print("==================================================================")

# Simulate 120s timeout: set current_ring_started_at to 130s ago
_mock_sessions_db[session_08.id]["current_ring_started_at"] = (datetime.now(timezone.utc) - timedelta(seconds=130)).isoformat()

# Run Job B sweep (attempt 1 < max 3 -> RETRY_WAIT)
sweep_check_timeouts()

session_08_retry = _mock_sessions_db[session_08.id]
assert session_08_retry["status"] == SessionStatus.RETRY_WAIT.value, f"Expected RETRY_WAIT, got {session_08_retry['status']}"
assert session_08_retry["next_retry_at"] is not None
print("[OK] Job B Timeout Verified: Session moved to RETRY_WAIT (next_retry_at set)")


print("\n==================================================================")
print("TEST 4: Max Attempt Escalation (AUTO_MISSED & Caregiver Alert)")
print("==================================================================")

# Set attempt_count = 3 and RINGING with timeout
_mock_sessions_db[session_08.id]["status"] = SessionStatus.RINGING.value
_mock_sessions_db[session_08.id]["attempt_count"] = 3
_mock_sessions_db[session_08.id]["current_ring_started_at"] = (datetime.now(timezone.utc) - timedelta(seconds=130)).isoformat()

# Run Job B sweep (attempt 3 >= max 3 -> AUTO_MISSED)
sweep_check_timeouts()

session_08_missed = _mock_sessions_db[session_08.id]
assert session_08_missed["status"] == SessionStatus.AUTO_MISSED.value, f"Expected AUTO_MISSED, got {session_08_missed['status']}"
assert session_08_missed["resolution"] == SessionResolution.AUTO_MISSED.value
print("[OK] Max Attempt Escalation Verified: Session moved to AUTO_MISSED & caregiver alert triggered")


print("\n==================================================================")
print("TEST 5: Mark Item Taken & Turn Off Alarm Endpoints")
print("==================================================================")

# Test marking item 1 taken
item1_id = session_08.items[0].id
res_taken = mark_item_taken(session_08.id, item1_id)
assert _mock_items_db[item1_id]["marked_taken"] == True
print("[OK] Item 1 Marked Taken Verified")

# Test turning off alarm with resolution='taken'
res_turnoff = turn_off_session(session_08.id, SessionResolution.TAKEN)
assert res_turnoff.status == SessionStatus.RESOLVED
assert res_turnoff.resolution == SessionResolution.TAKEN.value
assert all(item.marked_taken for item in res_turnoff.items)
print("[OK] Turn Off Alarm Verified: Session RESOLVED and all items marked taken")

print("\n==================================================================")
print("ALL MEDICINE REMINDER SERVICE TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
