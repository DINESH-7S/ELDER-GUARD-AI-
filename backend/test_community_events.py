import uuid
from datetime import datetime, timezone, timedelta

from app.events.models import CommunityEventCreate, EventCategory
from app.events.routes import (
    create_community_event,
    get_community_events,
    get_event_by_id,
    register_for_event,
    get_elder_registered_events,
    _mock_events_db,
    _mock_event_registrations_db,
)

print("==================================================================")
print("COMMUNITY EVENTS MICROSERVICE TEST SUITE")
print("==================================================================")

elder_id = str(uuid.uuid4())
organizer_id = str(uuid.uuid4())

user_elder = {"user_id": elder_id, "role": "elder", "name": "Senior Participant"}
user_organizer = {"user_id": organizer_id, "role": "caregiver", "name": "Community Coordinator"}

# STEP 1: Create Community Events (Yoga & Health Camp)
print("\n--- STEP 1: Create Community Events Test ---")
ev1_payload = CommunityEventCreate(
    title="Morning Senior Yoga & Meditation",
    description="Gentle stretching and breathing exercises tailored for seniors.",
    category=EventCategory.YOGA,
    event_date=datetime.now(timezone.utc) + timedelta(days=3),
    location="Central Park Community Center",
    organizer="Silver Wellness Club",
    registration_link="https://events.elderguard.ai/register/yoga-101",
    is_featured=True
)
ev1 = create_community_event(ev1_payload, user_organizer)
assert ev1.title == "Morning Senior Yoga & Meditation"
print(f"[OK] Step 1 Passed: Event 1 created (ID: {ev1.id}).")

ev2_payload = CommunityEventCreate(
    title="Free Senior Cardiac & BP Health Camp",
    description="Free blood pressure checkup and cardiologist consultation.",
    category=EventCategory.HEALTH_CAMP,
    event_date=datetime.now(timezone.utc) + timedelta(days=7),
    location="City General Hospital Auditorium",
    organizer="City Health Foundation",
    registration_link="https://events.elderguard.ai/register/health-camp-2026",
    is_featured=False
)
ev2 = create_community_event(ev2_payload, user_organizer)
assert ev2.category == EventCategory.HEALTH_CAMP
print(f"[OK] Step 1 Passed: Event 2 created (ID: {ev2.id}).")

# STEP 2: Get Events List & Category Filter
print("\n--- STEP 2: List & Category Filter Test ---")
all_events = get_community_events(current_user=user_elder)
assert len(all_events) >= 2

yoga_events = get_community_events(category=EventCategory.YOGA, current_user=user_elder)
assert len(yoga_events) == 1
assert yoga_events[0].id == ev1.id
print(f"[OK] Step 2 Passed: Events listed & filtered by category ({len(all_events)} total, {len(yoga_events)} yoga).")

# STEP 3: Get Event Details & Redirect Link
print("\n--- STEP 3: Get Event Details & Redirect Link Test ---")
ev_details = get_event_by_id(ev1.id, user_elder)
assert ev_details.registration_link == "https://events.elderguard.ai/register/yoga-101"
print(f"[OK] Step 3 Passed: Event details retrieved with redirect link: {ev_details.registration_link}")

# STEP 4: Elder Registration & Redirect Target Verification
print("\n--- STEP 4: Elder Event Registration Test ---")
reg_res = register_for_event(ev1.id, elder_id=elder_id, current_user=user_elder)
assert reg_res.event_id == ev1.id
assert reg_res.registration_link == "https://events.elderguard.ai/register/yoga-101"
print(f"[OK] Step 4 Passed: Elder registered for event and received redirect link: {reg_res.registration_link}")

# STEP 5: Duplicate Registration Handling
print("\n--- STEP 5: Duplicate Registration Handling Test ---")
dup_reg = register_for_event(ev1.id, elder_id=elder_id, current_user=user_elder)
assert dup_reg.id == reg_res.id  # Same registration returned idempotently
print("[OK] Step 5 Passed: Duplicate registration returned existing record.")

# STEP 6: Get Elder Registered Events History
print("\n--- STEP 6: Get Elder Registrations Test ---")
my_regs = get_elder_registered_events(elder_id, user_elder)
assert len(my_regs) == 1
assert my_regs[0].event_title == "Morning Senior Yoga & Meditation"
print(f"[OK] Step 6 Passed: Elder registered events history retrieved ({len(my_regs)} events).")

# STEP 7: FastAPI HTTP Route Endpoint Test
print("\n--- STEP 7: FastAPI HTTP Route Endpoint Test ---")
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_current_user

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user_elder

resp_list = client.get("/events/list")
assert resp_list.status_code == 200
assert len(resp_list.json()) >= 2

resp_reg = client.post(f"/events/{ev2.id}/register")
assert resp_reg.status_code == 201
assert resp_reg.json()["registration_link"] == "https://events.elderguard.ai/register/health-camp-2026"
print(f"[OK] Step 7 Passed: POST /events/{ev2.id[:8]}.../register returned 201 Created with redirect link.")

app.dependency_overrides.clear()

print("\n==================================================================")
print("ALL COMMUNITY EVENTS TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
