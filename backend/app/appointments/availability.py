import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Dict, Any, Optional

from app.core.database import supabase
from app.appointments.constants import AvailabilityMode, ConsultationMode
from app.appointments.schemas import AvailabilityCreate, AvailabilityResponse, SlotResponse

# Mock In-Memory Store
_mock_availability_db: Dict[str, Dict[str, Any]] = {}


def create_availability_policy(payload: AvailabilityCreate) -> AvailabilityResponse:
    avail_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    avail_data = {
        "id": avail_id,
        "doctor_id": payload.doctor_id,
        "day_of_week": payload.day_of_week,
        "specific_date": payload.specific_date.isoformat() if payload.specific_date else None,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "slot_duration_minutes": payload.slot_duration_minutes,
        "max_patients": payload.max_patients,
        "mode": payload.mode.value,
        "is_active": True,
        "created_at": now_str,
        "updated_at": now_str,
    }

    _mock_availability_db[avail_id] = avail_data

    if supabase is not None:
        try:
            supabase.table("doctor_availability").insert(avail_data).execute()
        except Exception:
            pass

    return AvailabilityResponse(**avail_data)


def compute_available_slots(
    doctor_id: str,
    target_date: date,
    existing_booked_slots: List[str]
) -> List[SlotResponse]:
    """
    Computes available slots for doctor_id on target_date.
    Precedence Rule:
    1. Check for specific_date override matching target_date. If found, use that policy.
    2. Else, match recurring day_of_week policy (0=Monday...6=Sunday).
    3. Generate time slots of length slot_duration_minutes.
    4. Exclude times in existing_booked_slots.
    """
    date_str = target_date.isoformat()
    weekday = target_date.weekday()

    # Query DB or mock store
    all_policies = []
    if supabase is not None:
        try:
            res = supabase.table("doctor_availability").select("*").eq("doctor_id", doctor_id).eq("is_active", True).execute()
            if res.data:
                all_policies = res.data
        except Exception:
            pass

    if not all_policies:
        all_policies = [p for p in _mock_availability_db.values() if p.get("doctor_id") == doctor_id and p.get("is_active", True)]

    # 1. Specific date overrides
    specific_policies = [p for p in all_policies if p.get("specific_date") == date_str]
    
    if specific_policies:
        selected_policies = specific_policies
    else:
        # 2. Recurring day_of_week
        selected_policies = [p for p in all_policies if p.get("day_of_week") == weekday]

    if not selected_policies:
        return []

    slots: List[SlotResponse] = []
    for pol in selected_policies:
        st_h, st_m = map(int, pol["start_time"].split(":")[:2])
        et_h, et_m = map(int, pol["end_time"].split(":")[:2])
        dur = pol.get("slot_duration_minutes", 30)

        curr = datetime.combine(target_date, time(st_h, st_m))
        end = datetime.combine(target_date, time(et_h, et_m))

        pol_mode_val = pol.get("mode", "both")
        mode = ConsultationMode.TELEMEDICINE if pol_mode_val == "telemedicine" else ConsultationMode.IN_PERSON

        while curr + timedelta(minutes=dur) <= end:
            s_time_str = curr.time().strftime("%H:%M:%S")
            next_t = curr + timedelta(minutes=dur)
            e_time_str = next_t.time().strftime("%H:%M:%S")

            is_avail = s_time_str not in existing_booked_slots

            slots.append(SlotResponse(
                start_time=s_time_str,
                end_time=e_time_str,
                mode=mode,
                is_available=is_avail
            ))
            curr = next_t

    return slots
