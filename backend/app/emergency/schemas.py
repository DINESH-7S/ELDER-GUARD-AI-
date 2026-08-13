from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from app.emergency.models import SOSStatus, SOSRecipientType


class SOSTriggerRequest(BaseModel):
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_accuracy_m: Optional[float] = None


class SOSResolveRequest(BaseModel):
    resolution_note: Optional[str] = None


class SOSEventLogResponse(BaseModel):
    id: str
    sos_event_id: str
    action: str
    actor_id: Optional[str] = None
    notification_broadcast_id: Optional[str] = None
    created_at: str


class SOSEventResponse(BaseModel):
    id: str
    elder_id: str
    triggered_at: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_accuracy_m: Optional[float] = None
    status: SOSStatus
    current_escalation_tier: int = 1
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: str
    logs: List[SOSEventLogResponse] = []


class SOSEscalationTierResponse(BaseModel):
    id: str
    elder_id: Optional[str] = None
    tier_number: int
    recipient_type: SOSRecipientType
    recipient_id: Optional[str] = None
    timeout_minutes: int
