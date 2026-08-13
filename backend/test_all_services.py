import sys
import subprocess

test_scripts = [
    "test_endpoints.py",
    "test_medicine_reminders.py",
    "test_notifications.py",
    "test_emergency.py",
    "test_appointments.py",
    "test_vitals.py",
    "test_ai_companion.py",
    "test_ocr.py",
    "test_reports.py",
    "test_analytics.py",
    "test_community_events.py",
]

print("==================================================================")
print("ELDERGUARD AI PLATFORM - MASTER SYSTEM VERIFICATION")
print("==================================================================")

results = {}

for script in test_scripts:
    print(f"\n>>> Running {script}...")
    proc = subprocess.run([sys.executable, script], capture_output=True, text=True)
    if proc.returncode == 0:
        results[script] = "PASSED [OK]"
        print(f"[OK] {script} PASSED!")
    else:
        results[script] = "FAILED"
        print(f"[FAIL] {script} FAILED!")
        print(proc.stdout)
        print(proc.stderr)

print("\n==================================================================")
print("MASTER TEST SUITE SUMMARY RESULTS")
print("==================================================================")
all_passed = True
for script, status in results.items():
    print(f"{script:<30} --> {status}")
    if status != "PASSED [OK]":
        all_passed = False

print("==================================================================")
if all_passed:
    print("ALL 11 MICROSERVICES TEST SUITES PASSED 100% CLEANLY!")
else:
    print("SOME TEST SUITES FAILED - SEE LOGS ABOVE.")
print("==================================================================")

