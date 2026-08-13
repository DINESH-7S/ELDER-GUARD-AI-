from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, model_validator


class VitalCreate(BaseModel):
    elder_id: str
    systolic_bp: Optional[int] = Field(None, ge=40, le=260)
    diastolic_bp: Optional[int] = Field(None, ge=20, le=160)
    pulse_bpm: Optional[int] = Field(None, ge=20, le=240)
    spo2_percent: Optional[float] = Field(None, ge=40.0, le=100.0)
    blood_sugar_mg_dl: Optional[float] = Field(None, ge=20.0, le=700.0)
    temperature_c: Optional[float] = Field(None, ge=28.0, le=45.0)
    notes: Optional[str] = None
    recorded_at: Optional[str] = None

    @model_validator(mode="after")
    def validate_at_least_one_metric_and_time(self):
        metrics = [
            self.systolic_bp,
            self.diastolic_bp,
            self.pulse_bpm,
            self.spo2_percent,
            self.blood_sugar_mg_dl,
            self.temperature_c,
        ]
        if not any(m is not None for m in metrics):
            raise ValueError("At least one vital sign metric must be provided.")

        if self.recorded_at:
            try:
                rec_dt = datetime.fromisoformat(self.recorded_at.replace("Z", "+00:00"))
                if rec_dt > datetime.now(timezone.utc):
                    raise ValueError("recorded_at timestamp cannot be in the future.")
            except ValueError as ve:
                if "future" in str(ve):
                    raise ve
                raise ValueError("Invalid ISO format for recorded_at timestamp.")

        return self


class VitalOut(BaseModel):
    id: str
    elder_id: str
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    pulse_bpm: Optional[int] = None
    spo2_percent: Optional[float] = None
    blood_sugar_mg_dl: Optional[float] = None
    temperature_c: Optional[float] = None
    notes: Optional[str] = None
    is_abnormal: bool = False
    abnormal_metrics: List[str] = []
    recorded_at: str
    created_at: str


class VitalTrendPoint(BaseModel):
    recorded_at: str
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    pulse_bpm: Optional[int] = None
    spo2_percent: Optional[float] = None
    blood_sugar_mg_dl: Optional[float] = None
    temperature_c: Optional[float] = None
