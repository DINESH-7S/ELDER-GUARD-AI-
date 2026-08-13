import uuid
from datetime import date, datetime, timedelta, timezone


from app.appointments.constants import AppointmentStatus, ConsultationMode, AvailabilityMode, CancelledBy, TelemedStatus
from app.appointments.exceptions import SlotConflictError, InvalidTransitionError
from app.appointments.schemas import (
    AvailabilityCreate,
    AppointmentBookRequest,
    AppointmentRescheduleRequest,
    AppointmentCancelRequest,
)
from app.appointments.availability import create_availability_policy, compute_available_slots, _mock_availability_db
from app.appointments.service import (
    book_appointment,
    confirm_appointment,
    check_in_appointment,
    start_consultation,
    complete_appointment,
    cancel_appointment,
    reschedule_appointment,
    get_appointment,
    _mock_appointments_db,
)
from app.appointments.scheduler import sweep_24h_reminders, sweep_2h_reminders, sweep_no_show, sweep_telemed_expiry

print("==================================================================")
print("DOCTOR & HOSPITAL APPOINTMENTS MICROSERVICE TEST SUITE")
print("==================================================================")

elder_id = str(uuid.uuid4())
doctor_id = str(uuid.uuid4())
hospital_id = str(uuid.uuid4())

user_elder = {"user_id": elder_id, "role": "elder", "name": "Elder User"}
user_doctor = {"user_id": doctor_id, "role": "doctor", "name": "Dr. Smith"}

today = date.today()
tomorrow = today + timedelta(days=1)
next_week = today + timedelta(days=7)

# STEP 1: Availability Configuration
print("\n--- STEP 1: Availability Policy Configuration ---")
pol_payload = AvailabilityCreate(
    doctor_id=doctor_id,
    day_of_week=tomorrow.weekday(),
    start_time="09:00:00",
    end_time="12:00:00",
    slot_duration_minutes=30,
    mode=AvailabilityMode.BOTH
)
pol = create_availability_policy(pol_payload)
assert pol.doctor_id == doctor_id
print(f"[OK] Step 1 Passed: Created recurring availability policy for day_of_week={pol.day_of_week}.")

# STEP 2: Compute Slots
print("\n--- STEP 2: Compute Slots Precedence ---")
slots = compute_available_slots(doctor_id, tomorrow, existing_booked_slots=[])
assert len(slots) == 6, f"Expected 6 30-min slots between 09:00 and 12:00, got {len(slots)}"
assert slots[0].start_time == "09:00:00"
assert slots[0].is_available == True
print(f"[OK] Step 2 Passed: Computed {len(slots)} available slots correctly.")

# STEP 3: Book Appointment
print("\n--- STEP 3: Book New Appointment ---")
book_req = AppointmentBookRequest(
    elder_id=elder_id,
    doctor_id=doctor_id,
    hospital_id=hospital_id,
    appointment_date=tomorrow,
    start_time="09:00:00",
    end_time="09:30:00",
    mode=ConsultationMode.IN_PERSON,
    idempotency_key=f"key_test_{uuid.uuid4().hex[:8]}"
)
appt_1 = book_appointment(book_req, user_elder)
assert appt_1.status == AppointmentStatus.SCHEDULED
assert len(appt_1.audit_logs) >= 1
print(f"[OK] Step 3 Passed: Appointment booked. ID: {appt_1.id}")

# STEP 4: Idempotency Validation
print("\n--- STEP 4: Idempotency Key Validation ---")
appt_idem = book_appointment(book_req, user_elder)
assert appt_idem.id == appt_1.id, "Expected same appointment for duplicate idempotency key"
print("[OK] Step 4 Passed: Duplicate idempotency key returned existing booking.")

# STEP 5: Double Booking Conflict Validation
print("\n--- STEP 5: Double Booking Conflict Validation ---")
conflict_req = AppointmentBookRequest(
    elder_id=str(uuid.uuid4()),
    doctor_id=doctor_id,
    appointment_date=tomorrow,
    start_time="09:00:00",
    end_time="09:30:00",
    mode=ConsultationMode.IN_PERSON
)
try:
    book_appointment(conflict_req, user_elder)
    assert False, "Should have raised SlotConflictError"
except SlotConflictError:
    print("[OK] Step 5 Passed: SlotConflictError raised on double-booking attempt.")

# STEP 6: Confirm Appointment
print("\n--- STEP 6: Confirm Appointment ---")
appt_conf = confirm_appointment(appt_1.id, user_doctor)
assert appt_conf.status == AppointmentStatus.CONFIRMED
print("[OK] Step 6 Passed: Appointment status moved to CONFIRMED.")

# STEP 7: Check-In & Queue Token Assignment
print("\n--- STEP 7: Check-In & Queue Token ---")
appt_checkin = check_in_appointment(appt_1.id, user_elder)
assert appt_checkin.status == AppointmentStatus.CHECKED_IN
assert appt_checkin.queue_token == "Q-001"
print("[OK] Step 7 Passed: Status moved to CHECKED_IN and assigned queue_token Q-001.")

# STEP 8: Start Consultation
print("\n--- STEP 8: Start Consultation ---")
appt_consult = start_consultation(appt_1.id, user_doctor)
assert appt_consult.status == AppointmentStatus.IN_CONSULTATION
print("[OK] Step 8 Passed: Status moved to IN_CONSULTATION.")

# STEP 9: Complete Appointment
print("\n--- STEP 9: Complete Appointment ---")
appt_comp = complete_appointment(appt_1.id, user_doctor)
assert appt_comp.status == AppointmentStatus.COMPLETED
print("[OK] Step 9 Passed: Appointment status moved to COMPLETED.")

# STEP 10: Reschedule Chain Logic
print("\n--- STEP 10: Reschedule Chain Logic ---")
book_req_2 = AppointmentBookRequest(
    elder_id=elder_id,
    doctor_id=doctor_id,
    appointment_date=tomorrow,
    start_time="10:00:00",
    end_time="10:30:00",
    mode=ConsultationMode.TELEMEDICINE
)
appt_2 = book_appointment(book_req_2, user_elder)

resched_req = AppointmentRescheduleRequest(
    new_date=next_week,
    new_start_time="11:00:00",
    new_end_time="11:30:00"
)
new_appt = reschedule_appointment(appt_2.id, resched_req, user_elder)

orig_after = get_appointment(appt_2.id, user_elder)
assert orig_after.status == AppointmentStatus.RESCHEDULED
assert new_appt.status == AppointmentStatus.SCHEDULED
assert new_appt.reschedule_from_id == appt_2.id
print(f"[OK] Step 10 Passed: Original marked RESCHEDULED, new appointment created referencing {appt_2.id}.")

# STEP 11: Cancel Appointment
print("\n--- STEP 11: Cancel Appointment ---")
cancel_req = AppointmentCancelRequest(cancelled_by=CancelledBy.ELDER, cancellation_reason="Personal conflict")
cancelled_appt = cancel_appointment(new_appt.id, cancel_req, user_elder)
assert cancelled_appt.status == AppointmentStatus.CANCELLED
assert cancelled_appt.cancelled_by == "elder"
print("[OK] Step 11 Passed: Appointment CANCELLED with cancellation reason.")

# STEP 12: Illegal Transition Rejection
print("\n--- STEP 12: Illegal Transition Rejection ---")
try:
    from app.appointments.service import enforce_transition
    enforce_transition(_mock_appointments_db[appt_1.id], AppointmentStatus.SCHEDULED)
    assert False, "Should have raised InvalidTransitionError"
except InvalidTransitionError:
    print("[OK] Step 12 Passed: InvalidTransitionError raised when attempting completed -> scheduled.")

# STEP 13: Background Scheduler Sweeps
print("\n--- STEP 13: Background Scheduler Sweeps ---")
sweep_24h_reminders()
sweep_2h_reminders()
sweep_no_show()
sweep_telemed_expiry()
print("[OK] Step 13 Passed: Scheduler sweeps executed cleanly without errors.")

# STEP 14: FastAPI HTTP Route Endpoint Test via TestClient
print("\n--- STEP 14: FastAPI HTTP Route Endpoint Test ---")
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user_elder

# Test POST /appointments/book
post_req = {
    "elder_id": elder_id,
    "doctor_id": doctor_id,
    "appointment_date": tomorrow.isoformat(),
    "start_time": "11:30:00",
    "end_time": "12:00:00",
    "mode": "telemedicine"
}
resp = client.post("/appointments/book", json=post_req)
assert resp.status_code == 201, f"POST /appointments/book failed: {resp.text}"
http_appt = resp.json()
print(f"[OK] POST /appointments/book returned 201 Created. ID: {http_appt['id']}")

# Test GET /appointments/{id}
resp_get = client.get(f"/appointments/{http_appt['id']}")
assert resp_get.status_code == 200
print(f"[OK] GET /appointments/{http_appt['id']} returned 200 OK.")

app.dependency_overrides.clear()

print("\n==================================================================")
print("ALL DOCTOR & HOSPITAL APPOINTMENTS TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
