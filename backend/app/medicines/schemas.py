from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field
from app.medicines.models import SessionStatus, SessionResolution


class MedicineCreate(BaseModel):
    elder_id: str
    name: str = Field(..., min_length=1)
    dosage: str = Field(..., min_length=1)
    times_of_day: List[str] = Field(..., description="List of 24h format times, e.g. ['08:00', '14:00']")
    start_date: date
    end_date: Optional[date] = None


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    times_of_day: Optional[List[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class MedicineResponse(BaseModel):
    id: str
    elder_id: str
    name: str
    dosage: str
    times_of_day: List[str]
    start_date: str
    end_date: Optional[str] = None
    is_active: bool
    created_by: str
    created_at: str
    updated_at: str


class ReminderSessionItemResponse(BaseModel):
    id: str
    session_id: str
    medicine_id: str
    medicine_name: str
    dosage: str
    marked_taken: bool
    marked_taken_at: Optional[str] = None


class ReminderSessionResponse(BaseModel):
    id: str
    elder_id: str
    scheduled_time: str
    status: SessionStatus
    attempt_count: int
    max_attempts: int
    current_ring_started_at: Optional[str] = None
    next_retry_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution: Optional[str] = None
    created_at: str
    items: List[ReminderSessionItemResponse] = []


class TurnOffSessionRequest(BaseModel):
    resolution: SessionResolution = SessionResolution.TAKEN
