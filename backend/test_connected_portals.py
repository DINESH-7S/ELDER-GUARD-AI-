import time
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def signup(role: str, suffix: str) -> dict:
    response = client.post(
        "/auth/signup/email",
        json={"email": f"{role}-{suffix}@example.com", "password": "SecurePassword123!", "role": role},
    )
    assert response.status_code == 201, response.text
    return response.json()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def create_elder_profile(token: str, name: str) -> dict:
    response = client.post(
        "/profiles/elder/",
        headers=auth(token),
        json={"name": name, "age_or_dob": "1948-05-15", "primary_language": "English"},
    )
    assert response.status_code in (200, 201), response.text
    return response.json()


def create_caregiver_profile(token: str, name: str) -> dict:
    response = client.post(
        "/profiles/caregiver/",
        headers=auth(token),
        json={"name": name, "relationship_to_elder": "Child"},
    )
    assert response.status_code in (200, 201), response.text
    return response.json()


def linked_pair(permission_level: str = "full_access") -> tuple[dict, dict]:
    suffix = str(int(time.time() * 1000))
    elder = signup("elder", suffix)
    caregiver = signup("caregiver", suffix)
    create_elder_profile(elder["access_token"], "Connected Elder")
    create_caregiver_profile(caregiver["access_token"], "Connected Caregiver")

    invite = client.post(
        "/api/caregiver/invite",
        headers=auth(caregiver["access_token"]),
        json={"elder_identifier": elder["user"]["id"], "permission_level": permission_level},
    )
    assert invite.status_code == 201, invite.text
    accept = client.post(
        f"/api/elder/invites/{invite.json()['id']}/accept",
        headers=auth(elder["access_token"]),
        json={"permission_level": permission_level},
    )
    assert accept.status_code == 200, accept.text
    return elder, caregiver


def test_invite_accept_and_permission_enforcement():
    elder, caregiver = linked_pair("full_access")
    response = client.get("/api/caregiver/elders", headers=auth(caregiver["access_token"]))
    assert response.status_code == 200
    assert any(item["id"] == elder["user"]["id"] for item in response.json())


def test_caregiver_added_medicine_visible_to_elder():
    elder, caregiver = linked_pair("full_access")
    response = client.post(
        f"/api/caregiver/elders/{elder['user']['id']}/medicines",
        headers=auth(caregiver["access_token"]),
        json={"name": "Lisinopril", "dosage": "10 mg", "scheduled_times": ["08:00"], "instructions": "Take with water"},
    )
    assert response.status_code == 201, response.text

    elder_meds = client.get("/api/elder/medicines", headers=auth(elder["access_token"]))
    assert elder_meds.status_code == 200
    assert any(med["name"] == "Lisinopril" for med in elder_meds.json())


def test_view_only_caregiver_cannot_write_elder_data():
    elder, caregiver = linked_pair("view_only")
    response = client.post(
        f"/api/caregiver/elders/{elder['user']['id']}/medicines",
        headers=auth(caregiver["access_token"]),
        json={"name": "Blocked", "dosage": "1 pill", "scheduled_times": ["08:00"]},
    )
    assert response.status_code == 403


def test_sos_trigger_pushes_websocket_event_to_caregiver_room():
    elder, caregiver = linked_pair("full_access")
    token = caregiver["access_token"]
    with client.websocket_connect(f"/ws/elder/{elder['user']['id']}?token={token}") as websocket:
        response = client.post(
            "/api/elder/sos",
            headers=auth(elder["access_token"]),
            json={"location": {"lat": 12.9, "lng": 77.6}},
        )
        assert response.status_code == 201, response.text
        event = websocket.receive_json()
        assert event["event"] == "sos:triggered"
        assert event["payload"]["elder_id"] == elder["user"]["id"]
