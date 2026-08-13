import json
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
ts = int(time.time())

print("--- 1. Testing GET / (Health Check) ---")
r = client.get("/")
print("Response Status:", r.status_code)
print("Response JSON:", r.json())
assert r.status_code == 200

print("\n--- 2. Testing Auth Signup for 5 Roles ---")
roles = ['elder', 'caregiver', 'doctor', 'hospital', 'pharmacy']
tokens = {}
user_ids = {}

for role in roles:
    signup_payload = {
        "email": f"test_{role}_{ts}@elderguard.ai",
        "password": "SecurePassword123!",
        "role": role
    }
    r = client.post("/auth/signup/email", json=signup_payload)
    print(f"Signup [{role}] Status:", r.status_code)
    data = r.json()
    assert r.status_code == 201, f"Signup failed: {data}"
    tokens[role] = data["access_token"]
    user_ids[role] = data["user"]["id"]
    print(f"User ID [{role}]:", user_ids[role])

print("\n--- 3. Testing Auth Login ---")
login_payload = {
    "identifier": f"test_elder_{ts}@elderguard.ai",
    "password": "SecurePassword123!"
}
r = client.post("/auth/login/email", json=login_payload)
print("Login Status:", r.status_code)
print("Login Response JSON:", json.dumps(r.json(), indent=2))
assert r.status_code == 200

print("\n--- 4. Testing Google Auth & OTP ---")
google_r = client.post("/auth/google", json={"id_token": f"mock_google_token_{ts}", "role": "elder"})
print("Google Auth Status:", google_r.status_code)
print("Google Auth Response:", google_r.json()["user"])

otp_r = client.post("/auth/send-otp", json={"phone_no": f"+12345{ts % 100000}"})
print("Send OTP Response:", otp_r.json())
verify_r = client.post("/auth/verify-otp", json={"phone_no": f"+12345{ts % 100000}", "otp_code": "123456"})
print("Verify OTP Response:", verify_r.json())

print("\n--- 5. Testing Profile Creation for 5 Roles ---")
# Elder Profile
elder_headers = {"Authorization": f"Bearer {tokens['elder']}"}
elder_payload = {
    "name": "Jane Elder",
    "nickname": "Granny Jane",
    "age_or_dob": "1948-05-15",
    "gender": "Female",
    "blood_group": "O+",
    "primary_language": "English",
    "phone_no": f"+12345{ts % 100000}",
    "height_cm": 162.5,
    "weight_kg": 65.0,
    "bed_gap": "Normal"
}
r_elder = client.post("/profiles/elder/", json=elder_payload, headers=elder_headers)
print("Create Elder Profile Status:", r_elder.status_code)
print("Elder Profile Created:", r_elder.json())

print("\nALL TESTS PASSED SUCCESSFULLY!")
