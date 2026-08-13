from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import date, time
from app.appointments.constants import (
    AppointmentStatus,
    ConsultationMode,
    AvailabilityMode,
    CancelledBy,
    TelemedStatus,
)


class AvailabilityCreate(BaseModel):
    doctor_id: str
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    specific_date: Optional[date] = None
    start_time: str
    end_time: str
    slot_duration_minutes: int = 30
    max_patients: int = 1
    mode: AvailabilityMode = AvailabilityMode.BOTH


class AvailabilityResponse(BaseModel):
    id: str
    doctor_id: str
    day_of_week: Optional[int] = None
    specific_date: Optional[str] = None
    start_time: str
    end_time: str
    slot_duration_minutes: int
    max_patients: int
    mode: AvailabilityMode
    is_active: bool
    created_at: str


class SlotResponse(BaseModel):
    start_time: str
    end_time: str
    mode: ConsultationMode
    is_available: bool


class AppointmentBookRequest(BaseModel):
    elder_id: str
    doctor_id: str
    hospital_id: Optional[str] = None
    appointment_date: date
    start_time: str
    end_time: str
    mode: ConsultationMode = ConsultationMode.IN_PERSON
    idempotency_key: Optional[str] = None


class AppointmentRescheduleRequest(BaseModel):
    new_date: date
    new_start_time: str
    new_end_time: str
    new_mode: Optional[ConsultationMode] = None


class AppointmentCancelRequest(BaseModel):
    cancelled_by: CancelledBy
    cancellation_reason: Optional[str] = None


class TelemedSessionResponse(BaseModel):
    id: str
    appointment_id: str
    room_name: str
    join_url: str
    host_url: str
    status: TelemedStatus
    expires_at: str
    started_at: Optional[str] = None
    ended_at: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: str
    appointment_id: str
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    actor_id: Optional[str] = None
    note: Optional[str] = None
    created_at: str


class AppointmentResponse(BaseModel):
    id: str
    elder_id: str
    elder_name: Optional[str] = None
    elder_email: Optional[str] = None
    elder_phone_no: Optional[str] = None
    elder_profile_pic_url: Optional[str] = None
    doctor_id: str
    hospital_id: Optional[str] = None
    appointment_date: str
    start_time: str
    end_time: str
    mode: ConsultationMode
    status: AppointmentStatus
    reschedule_from_id: Optional[str] = None
    queue_token: Optional[str] = None
    cancelled_by: Optional[str] = None
    cancellation_reason: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: str
    telemed_session: Optional[TelemedSessionResponse] = None
    audit_logs: List[AuditLogResponse] = []
