from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class AdherenceStats(BaseModel):
    elder_id: str
    total_doses_scheduled: int
    taken_count: int
    missed_count: int
    adherence_percent: float
    timeframe_days: int


class VitalsSummaryStats(BaseModel):
    elder_id: str
    timeframe_days: int
    total_readings_count: int
    abnormal_readings_count: int
    stability_index: str  # 'STABLE', 'MODERATE', 'UNSTABLE'
    avg_systolic_bp: Optional[float] = None
    avg_diastolic_bp: Optional[float] = None
    avg_pulse_bpm: Optional[float] = None
    avg_spo2_percent: Optional[float] = None
    avg_blood_sugar_mg_dl: Optional[float] = None
    avg_temperature_c: Optional[float] = None


class DailyDigestOut(BaseModel):
    id: str
    elder_id: str
    digest_date: str
    adherence_percent: float
    vitals_stability_index: str
    abnormal_vitals_count: int
    upcoming_appointments_count: int
    summary_text: str
    created_at: str
