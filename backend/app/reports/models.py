from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ReportType(str, Enum):
    LAB_RESULT = "lab_result"
    PRESCRIPTION = "prescription"
    DISCHARGE_SUMMARY = "discharge_summary"
    IMAGING = "imaging"
    OTHER = "other"


class ReportCreate(BaseModel):
    elder_id: str
    title: str = Field(..., min_length=1)
    report_type: ReportType = ReportType.LAB_RESULT
    file_url: str = Field(..., min_length=1)
    notes: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None


class ReportOut(BaseModel):
    id: str
    elder_id: str
    uploaded_by: str
    title: str
    report_type: ReportType
    file_url: str
    notes: Optional[str] = None
    parsed_data: Dict[str, Any] = {}
    uploaded_at: str
    created_at: str
