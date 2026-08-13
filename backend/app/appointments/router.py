from typing import List, Optional
from datetime import date
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.core.security import get_current_user
from app.appointments.schemas import (
    AvailabilityCreate,
    AvailabilityResponse,
    SlotResponse,
    AppointmentBookRequest,
    AppointmentRescheduleRequest,
    AppointmentCancelRequest,
    AppointmentResponse,
)
from app.appointments.availability import create_availability_policy, compute_available_slots
from app.appointments.service import (
    book_appointment,
    confirm_appointment,
    check_in_appointment,
    start_consultation,
    complete_appointment,
    cancel_appointment,
    reschedule_appointment,
    get_appointment,
    list_appointments_for_user,
)

from app.profiles.doctor import fetch_all_doctors_internal, DoctorProfileResponse

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("/doctors", response_model=List[DoctorProfileResponse])
def get_all_registered_doctors(
    specialization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Returns list of registered doctors available for appointment booking."""
    docs = fetch_all_doctors_internal()
    if specialization:
        spec_clean = specialization.strip().lower()
        docs = [d for d in docs if spec_clean in (d.get("specialization") or "").lower()]
    return [DoctorProfileResponse.model_validate(d) for d in docs]


@router.post("/availability", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
def set_doctor_availability(
    payload: AvailabilityCreate,
    current_user: dict = Depends(get_current_user)
):
    """Configures recurring or specific date availability policy for a doctor."""
    if current_user.get("role") not in ["doctor", "hospital"]:
        raise HTTPException(status_code=403, detail="Only doctors or hospital admins can configure availability.")
    return create_availability_policy(payload)


@router.get("/slots/{doctor_id}", response_model=List[SlotResponse])
def get_doctor_slots(
    doctor_id: str,
    target_date: date = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Computes available time slots for doctor_id on target_date."""
    date_str = target_date.isoformat()
    appts = list_appointments_for_user(current_user, doctor_id=doctor_id)
    booked = [
        str(a.start_time) for a in appts
        if str(a.appointment_date) == date_str and a.status.value not in ["cancelled", "rescheduled"]
    ]
    return compute_available_slots(doctor_id, target_date, booked)


@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def book_new_appointment(
    payload: AppointmentBookRequest,
    current_user: dict = Depends(get_current_user)
):
    """Books new appointment with conflict validation and idempotency."""
    return book_appointment(payload, current_user)


@router.get("/{id}", response_model=AppointmentResponse)
def get_appointment_details(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Returns appointment details and audit logs."""
    return get_appointment(id, current_user)


@router.get("/", response_model=List[AppointmentResponse])
def list_appointments(
    elder_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Lists appointments for elder or doctor."""
    return list_appointments_for_user(current_user, elder_id=elder_id, doctor_id=doctor_id)


@router.put("/{id}/confirm", response_model=AppointmentResponse)
def confirm_appt(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Confirms appointment."""
    return confirm_appointment(id, current_user)


@router.put("/{id}/check-in", response_model=AppointmentResponse)
def check_in_appt(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Patient check-in and queue token assignment."""
    return check_in_appointment(id, current_user)


@router.put("/{id}/start-consultation", response_model=AppointmentResponse)
def start_consultation_appt(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Starts consultation session."""
    return start_consultation(id, current_user)


@router.put("/{id}/complete", response_model=AppointmentResponse)
def complete_appt(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Completes appointment."""
    return complete_appointment(id, current_user)


@router.put("/{id}/cancel", response_model=AppointmentResponse)
def cancel_appt(
    id: str,
    payload: AppointmentCancelRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cancels appointment."""
    return cancel_appointment(id, payload, current_user)


@router.put("/{id}/reschedule", response_model=AppointmentResponse)
def reschedule_appt(
    id: str,
    payload: AppointmentRescheduleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reschedules appointment into a new chained appointment record."""
    return reschedule_appointment(id, payload, current_user)
