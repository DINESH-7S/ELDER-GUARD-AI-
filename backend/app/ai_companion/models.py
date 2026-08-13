from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, model_validator


class ChatRole(str, Enum):
    USER = "user"
    MODEL = "model"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    elder_id: str
    message: str = Field(..., min_length=1)
    history: List[ChatMessage] = []
    mode: str = "companion"  # 'companion' or 'checkin'
    health_context: Optional[str] = None  # Injected vitals/medicines/reports summary

    @model_validator(mode="after")
    def validate_non_empty_message(self):
        if not self.message.strip():
            raise ValueError("Message content cannot be blank or whitespace-only.")
        return self


class ChatResponse(BaseModel):
    reply: str
    distress_flagged: bool = False
    created_at: str


class HealthReviewRequest(BaseModel):
    elder_id: str
    vitals: dict = {}
    medicines: list = []
    appointments: list = []
    notes: Optional[str] = None


class HealthReviewResponse(BaseModel):
    review: str
    created_at: str


class VitalsReportRequest(BaseModel):
    elder_id: str
    vitals_history: list = []  # List of vitals readings over time
    current_vitals: dict = {}
    medicines: list = []
    elder_name: Optional[str] = None
    elder_age: Optional[int] = None
    notes: Optional[str] = None


class VitalsReportResponse(BaseModel):
    report: str
    summary: str
    risk_flags: list = []
    created_at: str


class ChatLogEntry(BaseModel):
    id: str
    elder_id: str
    role: ChatRole
    content: str
    created_at: str
