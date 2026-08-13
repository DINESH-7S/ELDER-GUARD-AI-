from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class InviteRequest(BaseModel):
    elder_identifier: str
    permission_level: str = Field(default="full_access", pattern="^(full_access|view_only)$")


class InviteAcceptRequest(BaseModel):
    permission_level: Optional[str] = Field(default=None, pattern="^(full_access|view_only)$")


class MedicineCreateRequest(BaseModel):
    name: str
    dosage: str
    frequency: Optional[str] = None
    scheduled_times: List[str] = Field(default_factory=list)
    instructions: Optional[str] = None
    stock_count: int = 30
    low_stock_threshold: int = 7


class MedicineTakenRequest(BaseModel):
    scheduled_time: Optional[str] = None


class VitalCreateRequest(BaseModel):
    type: str = Field(pattern="^(bp|sugar|heart_rate|spo2|weight|sleep)$")
    value: Dict[str, Any]
    unit: Optional[str] = None
    recorded_at: Optional[str] = None
    source: str = Field(default="manual", pattern="^(manual|device_sync)$")


class AppointmentCreateRequest(BaseModel):
    doctor_id: Optional[str] = None
    hospital_id: Optional[str] = None
    scheduled_at: str
    mode: str = Field(pattern="^(video|in_person)$")
    notes: Optional[str] = None


class SOSTriggerRequest(BaseModel):
    location: Optional[Dict[str, float]] = None


class SOSResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None


class CheckInRequest(BaseModel):
    mood: str = Field(pattern="^(calm|tired|unwell|happy)$")
    ok_status: bool = True


class ReminderCreateRequest(BaseModel):
    type: str = Field(pattern="^(medicine|appointment|water|activity|custom)$")
    scheduled_time: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class MessageCreateRequest(BaseModel):
    receiver_id: str
    elder_context_id: str
    content: str
    attachment_url: Optional[str] = None
