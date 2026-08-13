from typing import Optional, List, Dict, Any
from datetime import date
from pydantic import BaseModel, Field


class ExtractedMedicine(BaseModel):
    name: str
    dosage: str
    times_of_day: List[str] = ["08:00"]
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PrescriptionScanRequest(BaseModel):
    elder_id: str
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    sample_text: Optional[str] = None  # For text-based scanning test fallback
    auto_create_medicines: bool = True


class ReportScanRequest(BaseModel):
    elder_id: str
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    sample_text: Optional[str] = None


class PrescriptionScanResponse(BaseModel):
    scan_id: str
    elder_id: str
    raw_text: str
    medicines: List[ExtractedMedicine]
    auto_created_count: int
    created_at: str


class ReportScanResponse(BaseModel):
    scan_id: str
    elder_id: str
    raw_text: str
    lab_values: Dict[str, Any]
    created_at: str
