import uuid
import logging
from datetime import datetime, date, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy import text

from app.core.security import get_current_user
from app.core.database import supabase, local_engine
from app.analytics.models import AdherenceStats, VitalsSummaryStats, DailyDigestOut
from app.medicines.service import get_medicines_for_elder
from app.vitals.routes import get_vitals_list
from app.appointments.service import list_appointments_for_user

logger = logging.getLogger("elderguard.analytics.routes")

router = APIRouter(prefix="/analytics", tags=["Caregiver Analytics & Digest"])

# In-memory mock storage for health digests testing & fallback
_mock_digests_db: List[Dict[str, Any]] = []


def verify_analytics_access(current_user: dict, elder_id: str):
    user_id = current_user.get("user_id")
    role = current_user.get("role")

    if user_id == elder_id:
        return True
    if role in ["caregiver", "doctor", "hospital"]:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"User '{user_id}' with role '{role}' is not authorized to access analytics for elder '{elder_id}'."
    )


@router.get("/adherence/{elder_id}", response_model=AdherenceStats)
def get_medicine_adherence_stats(
    elder_id: str,
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Computes medicine adherence percentage for an elder from active database."""
    verify_analytics_access(current_user, elder_id)

    total_doses = 0
    taken_doses = 0
    missed_doses = 0

    if supabase is not None:
        try:
            res = supabase.table("reminder_sessions").select("id, status").eq("elder_id", elder_id).execute()
            if res.data:
                for session in res.data:
                    s_id = session["id"]
                    items_res = supabase.table("reminder_session_items").select("marked_taken").eq("session_id", s_id).execute()
                    if items_res.data:
                        items = items_res.data
                        total_doses += len(items)
                        taken_doses += len([it for it in items if it.get("marked_taken")])
                        if session.get("status") == "AUTO_MISSED":
                            missed_doses += len([it for it in items if not it.get("marked_taken")])
        except Exception as e:
            logger.warning(f"Cloud Supabase adherence stats error: {e}")

    if total_doses == 0 and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("""
                        SELECT rsi.marked_taken, rs.status 
                        FROM reminder_session_items rsi
                        JOIN reminder_sessions rs ON rsi.session_id = rs.id
                        WHERE rs.elder_id = :elder_id
                    """),
                    {"elder_id": elder_id}
                )
                rows = res.fetchall()
                total_doses = len(rows)
                taken_doses = len([r for r in rows if r[0]])
                missed_doses = len([r for r in rows if not r[0] and r[1] == 'AUTO_MISSED'])
        except Exception as e:
            logger.warning(f"Local PostgreSQL adherence stats error: {e}")

    if total_doses == 0:
        from app.medicines.service import _mock_sessions_db, _mock_items_db
        mock_sessions = [s for s in _mock_sessions_db if s.get("elder_id") == elder_id]
        for s in mock_sessions:
            s_id = s.get("id")
            items = [it for it in _mock_items_db if it.get("session_id") == s_id]
            total_doses += len(items)
            taken_doses += len([it for it in items if it.get("marked_taken")])
            if s.get("status") == "AUTO_MISSED":
                missed_doses += len([it for it in items if not it.get("marked_taken")])

    adherence_pct = round((taken_doses / total_doses * 100.0), 1) if total_doses > 0 else 100.0

    return AdherenceStats(
        elder_id=elder_id,
        total_doses_scheduled=total_doses,
        taken_count=taken_doses,
        missed_count=missed_doses,
        adherence_percent=adherence_pct,
        timeframe_days=days
    )


@router.get("/vitals-summary/{elder_id}", response_model=VitalsSummaryStats)
def get_vitals_summary_stats(
    elder_id: str,
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Aggregates vitals averages and stability index for an elder from active database."""
    verify_analytics_access(current_user, elder_id)

    elder_vitals = get_vitals_list(elder_id=elder_id, limit=100, offset=0, current_user=current_user)
    total_count = len(elder_vitals)
    abnormal_count = len([v for v in elder_vitals if v.is_abnormal])

    abnormal_ratio = (abnormal_count / total_count) if total_count > 0 else 0.0
    if abnormal_ratio > 0.5:
        stability = "UNSTABLE"
    elif abnormal_ratio > 0.2:
        stability = "MODERATE"
    else:
        stability = "STABLE"

    sys_bp = [v.systolic_bp for v in elder_vitals if v.systolic_bp is not None]
    dia_bp = [v.diastolic_bp for v in elder_vitals if v.diastolic_bp is not None]
    pulse = [v.pulse_bpm for v in elder_vitals if v.pulse_bpm is not None]
    spo2 = [v.spo2_percent for v in elder_vitals if v.spo2_percent is not None]
    sugar = [v.blood_sugar_mg_dl for v in elder_vitals if v.blood_sugar_mg_dl is not None]
    temp = [v.temperature_c for v in elder_vitals if v.temperature_c is not None]

    return VitalsSummaryStats(
        elder_id=elder_id,
        timeframe_days=days,
        total_readings_count=total_count,
        abnormal_readings_count=abnormal_count,
        stability_index=stability,
        avg_systolic_bp=round(sum(sys_bp) / len(sys_bp), 1) if sys_bp else None,
        avg_diastolic_bp=round(sum(dia_bp) / len(dia_bp), 1) if dia_bp else None,
        avg_pulse_bpm=round(sum(pulse) / len(pulse), 1) if pulse else None,
        avg_spo2_percent=round(sum(spo2) / len(spo2), 1) if spo2 else None,
        avg_blood_sugar_mg_dl=round(sum(sugar) / len(sugar), 1) if sugar else None,
        avg_temperature_c=round(sum(temp) / len(temp), 1) if temp else None
    )


@router.get("/daily-digest/{elder_id}", response_model=DailyDigestOut)
def get_daily_health_digest(
    elder_id: str,
    target_date: Optional[date] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Generates comprehensive daily health summary digest for caregivers."""
    verify_analytics_access(current_user, elder_id)

    digest_d = target_date or date.today()
    date_str = digest_d.isoformat()
    digest_id = f"digest_{elder_id[:8]}_{date_str}"

    adherence = get_medicine_adherence_stats(elder_id, days=1, current_user=current_user)
    vitals_sum = get_vitals_summary_stats(elder_id, days=1, current_user=current_user)
    appts = list_appointments_for_user(current_user=current_user, elder_id=elder_id)
    upcoming_appts = len([a for a in appts if a.status.value in ["scheduled", "confirmed"]])

    summary_text = (
        f"Elder Health Summary for {date_str}: Medicine Adherence is {adherence.adherence_percent}%. "
        f"Vitals overall status is {vitals_sum.stability_index} ({vitals_sum.abnormal_readings_count} abnormal flags). "
        f"{upcoming_appts} upcoming appointment(s) scheduled."
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    digest_data = {
        "id": digest_id,
        "elder_id": elder_id,
        "digest_date": date_str,
        "adherence_percent": adherence.adherence_percent,
        "vitals_stability_index": vitals_sum.stability_index,
        "abnormal_vitals_count": vitals_sum.abnormal_readings_count,
        "upcoming_appointments_count": upcoming_appts,
        "summary_text": summary_text,
        "created_at": now_iso,
    }

    _mock_digests_db.append(digest_data)

    if supabase is not None:
        try:
            supabase.table("daily_health_digests").upsert(digest_data, on_conflict="elder_id,digest_date").execute()
        except Exception as e:
            logger.warning(f"Cloud Supabase daily digest upsert error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO daily_health_digests (id, elder_id, digest_date, adherence_percent, vitals_stability_index, abnormal_vitals_count, upcoming_appointments_count, summary_text, created_at)
                        VALUES (:id, :elder_id, :digest_date, :adherence_percent, :vitals_stability_index, :abnormal_vitals_count, :upcoming_appointments_count, :summary_text, :created_at)
                        ON CONFLICT (elder_id, digest_date) DO UPDATE SET
                            adherence_percent = EXCLUDED.adherence_percent,
                            vitals_stability_index = EXCLUDED.vitals_stability_index,
                            abnormal_vitals_count = EXCLUDED.abnormal_vitals_count,
                            upcoming_appointments_count = EXCLUDED.upcoming_appointments_count,
                            summary_text = EXCLUDED.summary_text
                    """),
                    digest_data
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Local PostgreSQL daily digest upsert error: {e}")

    return DailyDigestOut(**digest_data)
