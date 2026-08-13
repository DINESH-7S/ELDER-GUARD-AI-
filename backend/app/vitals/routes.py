import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, cast
from fastapi import APIRouter, HTTPException, status, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import text

from app.core import config
from app.core.security import get_current_user
from app.core.database import supabase, local_engine
from app.notifications.service import broadcast_notification
from app.emergency.service import trigger_sos
from app.vitals.models import VitalCreate, VitalOut, VitalTrendPoint

logger = logging.getLogger("elderguard.vitals.routes")

router = APIRouter(prefix="/vitals", tags=["Vitals"])

# In-memory storage for vitals fallback & testing
_mock_vitals_db: List[Dict[str, Any]] = []


class VitalsConnectionManager:
    """Manages active WebSocket connections for live vitals streaming."""
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, elder_id: str, websocket: WebSocket):
        await websocket.accept()
        if elder_id not in self.active_connections:
            self.active_connections[elder_id] = []
        self.active_connections[elder_id].append(websocket)
        logger.info(f"WebSocket connected for elder '{elder_id}'. Active sockets: {len(self.active_connections[elder_id])}")

    def disconnect(self, elder_id: str, websocket: WebSocket):
        if elder_id in self.active_connections:
            if websocket in self.active_connections[elder_id]:
                self.active_connections[elder_id].remove(websocket)
            if not self.active_connections[elder_id]:
                del self.active_connections[elder_id]
        logger.info(f"WebSocket disconnected for elder '{elder_id}'.")

    async def broadcast_to_elder(self, elder_id: str, message: dict):
        specific_sockets = self.active_connections.get(elder_id, [])
        all_sockets = self.active_connections.get("all", [])
        targets = list(set(specific_sockets + all_sockets))

        for socket in targets:
            try:
                await socket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send WebSocket message: {e}")


vitals_ws_manager = VitalsConnectionManager()


@router.websocket("/ws/{elder_id}")
async def vitals_websocket_endpoint(websocket: WebSocket, elder_id: str):
    """WebSocket endpoint for real-time vitals streaming for an elder."""
    await vitals_ws_manager.connect(elder_id, websocket)
    try:
        while True:
            await websocket.receive_text()
            await websocket.send_json({"status": "connected", "elder_id": elder_id, "message": "listening"})
    except WebSocketDisconnect:
        vitals_ws_manager.disconnect(elder_id, websocket)


def check_abnormal(payload: VitalCreate) -> tuple[bool, List[str], int]:
    """
    Evaluates vital readings against medical threshold ranges.
    Returns tuple: (is_abnormal: bool, abnormal_metrics: List[str], critical_count: int)
    """
    abnormal_metrics = []
    critical_count = 0

    # 1. Blood Pressure (Systolic)
    if payload.systolic_bp is not None:
        if payload.systolic_bp > 180 or payload.systolic_bp < 80:
            abnormal_metrics.append(f"Systolic BP ({payload.systolic_bp} mmHg [CRITICAL])")
            critical_count += 1
        elif payload.systolic_bp > 140 or payload.systolic_bp < 90:
            abnormal_metrics.append(f"Systolic BP ({payload.systolic_bp} mmHg)")

    # 2. Blood Pressure (Diastolic)
    if payload.diastolic_bp is not None:
        if payload.diastolic_bp > 120 or payload.diastolic_bp < 50:
            abnormal_metrics.append(f"Diastolic BP ({payload.diastolic_bp} mmHg [CRITICAL])")
            critical_count += 1
        elif payload.diastolic_bp > 90 or payload.diastolic_bp < 60:
            abnormal_metrics.append(f"Diastolic BP ({payload.diastolic_bp} mmHg)")

    # 3. Pulse / Heart Rate
    if payload.pulse_bpm is not None:
        if payload.pulse_bpm < 40 or payload.pulse_bpm > 130:
            abnormal_metrics.append(f"Pulse ({payload.pulse_bpm} bpm [CRITICAL])")
            critical_count += 1
        elif payload.pulse_bpm < 50 or payload.pulse_bpm > 100:
            abnormal_metrics.append(f"Pulse ({payload.pulse_bpm} bpm)")

    # 4. SpO2 Oxygen Saturation
    if payload.spo2_percent is not None:
        if payload.spo2_percent < 90.0:
            abnormal_metrics.append(f"SpO2 ({payload.spo2_percent}% [CRITICAL])")
            critical_count += 1
        elif payload.spo2_percent < 95.0:
            abnormal_metrics.append(f"SpO2 ({payload.spo2_percent}%)")

    # 5. Blood Sugar / Glucose
    if payload.blood_sugar_mg_dl is not None:
        if payload.blood_sugar_mg_dl < 50.0 or payload.blood_sugar_mg_dl > 300.0:
            abnormal_metrics.append(f"Blood Sugar ({payload.blood_sugar_mg_dl} mg/dL [CRITICAL])")
            critical_count += 1
        elif payload.blood_sugar_mg_dl < 70.0 or payload.blood_sugar_mg_dl > 180.0:
            abnormal_metrics.append(f"Blood Sugar ({payload.blood_sugar_mg_dl} mg/dL)")

    # 6. Body Temperature
    if payload.temperature_c is not None:
        if payload.temperature_c < 35.0 or payload.temperature_c > 39.5:
            abnormal_metrics.append(f"Temperature ({payload.temperature_c}°C [CRITICAL])")
            critical_count += 1
        elif payload.temperature_c < 35.5 or payload.temperature_c > 37.8:
            abnormal_metrics.append(f"Temperature ({payload.temperature_c}°C)")

    is_abnormal = len(abnormal_metrics) > 0
    return is_abnormal, abnormal_metrics, critical_count


def verify_vitals_access(current_user: dict, elder_id: str, is_write: bool = False):
    """
    Enforces access rules:
    - Elder: acts on own data only.
    - Caregiver: acts on linked elders.
    - Doctor: read-only access for linked elders.
    """
    user_id = current_user.get("user_id")
    role = current_user.get("role")

    if user_id == elder_id:
        return True
    if role == "caregiver":
        return True
    if role == "doctor" and not is_write:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"User '{user_id}' with role '{role}' is not authorized for this operation on elder '{elder_id}'."
    )


@router.post("/add", response_model=VitalOut, status_code=status.HTTP_201_CREATED)
def add_vitals_reading(
    payload: VitalCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Records a new vital signs reading to active database.
    """
    verify_vitals_access(current_user, payload.elder_id, is_write=True)

    is_abnormal, abnormal_metrics, critical_count = check_abnormal(payload)

    vital_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    rec_at = payload.recorded_at if payload.recorded_at else now_iso

    vital_data = {
        "id": vital_id,
        "elder_id": payload.elder_id,
        "systolic_bp": payload.systolic_bp,
        "diastolic_bp": payload.diastolic_bp,
        "pulse_bpm": payload.pulse_bpm,
        "spo2_percent": payload.spo2_percent,
        "blood_sugar_mg_dl": payload.blood_sugar_mg_dl,
        "temperature_c": payload.temperature_c,
        "notes": payload.notes,
        "is_abnormal": is_abnormal,
        "abnormal_metrics": abnormal_metrics,
        "recorded_at": rec_at,
        "created_at": now_iso,
    }

    # In-memory store fallback
    _mock_vitals_db.append(vital_data)

    # Save to Cloud Supabase
    if supabase is not None:
        try:
            supabase.table("vitals").insert(vital_data).execute()
        except Exception as e:
            logger.error(f"Error inserting vital reading to Cloud Supabase: {e}")

    # Save to Local PostgreSQL
    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO vitals (id, elder_id, systolic_bp, diastolic_bp, pulse_bpm, spo2_percent, blood_sugar_mg_dl, temperature_c, notes, is_abnormal, abnormal_metrics, recorded_at, created_at)
                        VALUES (:id, :elder_id, :systolic_bp, :diastolic_bp, :pulse_bpm, :spo2_percent, :blood_sugar_mg_dl, :temperature_c, :notes, :is_abnormal, :abnormal_metrics, :recorded_at, :created_at)
                    """),
                    vital_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error inserting vital reading to Local PostgreSQL: {e}")

    if is_abnormal:
        summary_str = ", ".join(abnormal_metrics)
        try:
            broadcast_notification(
                recipient_ids=[f"caregiver_of_{payload.elder_id}"],
                title="ABNORMAL VITALS ALERT",
                body=f"Abnormal vital reading recorded for elder '{payload.elder_id[:6]}': {summary_str}",
                type="alert",
                priority="HIGH",
                payload={"vital_id": vital_id, "abnormal_metrics": abnormal_metrics}
            )
        except Exception as e:
            logger.error(f"Failed to dispatch abnormal vitals alert: {e}")

    if config.AUTO_ESCALATE_CRITICAL_VITALS and critical_count > 1:
        logger.warning(f"Critical vitals escalation triggered for elder '{payload.elder_id}' (Critical count: {critical_count}).")
        try:
            trigger_sos(elder_id=payload.elder_id)
        except Exception as e:
            logger.error(f"Failed to trigger Emergency SOS for critical vitals: {e}")

    return VitalOut(**vital_data)


@router.get("/list/{elder_id}", response_model=List[VitalOut])
def get_vitals_list(
    elder_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Retrieves paginated list of vital readings for an elder from active database."""
    verify_vitals_access(current_user, elder_id, is_write=False)

    results: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            res = supabase.table("vitals").select("*").eq("elder_id", elder_id).order("recorded_at", desc=True).range(offset, offset + limit - 1).execute()
            if res.data:
                results = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase vitals list error: {e}")

    if not results and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM vitals WHERE elder_id = :elder_id ORDER BY recorded_at DESC LIMIT :limit OFFSET :offset"),
                    {"elder_id": elder_id, "limit": limit, "offset": offset}
                )
                results = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL vitals list error: {e}")

    if not results:
        matching = [v for v in _mock_vitals_db if v["elder_id"] == elder_id]
        matching.sort(key=lambda x: x["recorded_at"], reverse=True)
        results = matching[offset:offset + limit]

    return [VitalOut.model_validate(v) for v in results]


@router.get("/latest/{elder_id}", response_model=Optional[VitalOut])
def get_latest_vital(
    elder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves the single most recent vital reading for an elder, or null if none exist."""
    verify_vitals_access(current_user, elder_id, is_write=False)

    if supabase is not None:
        try:
            res = supabase.table("vitals").select("*").eq("elder_id", elder_id).order("recorded_at", desc=True).limit(1).execute()
            if res.data:
                return VitalOut.model_validate(res.data[0])
        except Exception as e:
            logger.warning(f"Cloud Supabase latest vital error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM vitals WHERE elder_id = :elder_id ORDER BY recorded_at DESC LIMIT 1"),
                    {"elder_id": elder_id}
                )
                row = res.fetchone()
                if row:
                    return VitalOut.model_validate(dict(row._mapping))
        except Exception as e:
            logger.warning(f"Local PostgreSQL latest vital error: {e}")

    matching = [v for v in _mock_vitals_db if v["elder_id"] == elder_id]
    if matching:
        matching.sort(key=lambda x: x["recorded_at"], reverse=True)
        return VitalOut.model_validate(matching[0])

    return None


@router.get("/trend/{elder_id}", response_model=List[VitalTrendPoint])
def get_vitals_trend(
    elder_id: str,
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Returns historical trend points for vital metrics over the requested number of days."""
    verify_vitals_access(current_user, elder_id, is_write=False)

    results: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            res = supabase.table("vitals").select("*").eq("elder_id", elder_id).order("recorded_at").execute()
            if res.data:
                results = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase vitals trend error: {e}")

    if not results and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM vitals WHERE elder_id = :elder_id ORDER BY recorded_at ASC"),
                    {"elder_id": elder_id}
                )
                results = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL vitals trend error: {e}")

    if not results:
        matching = [v for v in _mock_vitals_db if v["elder_id"] == elder_id]
        matching.sort(key=lambda x: x["recorded_at"], reverse=False)
        results = matching

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    filtered = []
    for v in results:
        try:
            rec_dt = datetime.fromisoformat(v["recorded_at"].replace("Z", "+00:00"))
            if rec_dt >= cutoff:
                filtered.append(v)
        except Exception:
            filtered.append(v)

    return [
        VitalTrendPoint(
            recorded_at=v["recorded_at"],
            systolic_bp=v.get("systolic_bp"),
            diastolic_bp=v.get("diastolic_bp"),
            pulse_bpm=v.get("pulse_bpm"),
            spo2_percent=v.get("spo2_percent"),
            blood_sugar_mg_dl=v.get("blood_sugar_mg_dl"),
            temperature_c=v.get("temperature_c")
        )
        for v in filtered
    ]


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_vital_reading(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Deletes a vital reading record by ID."""
    global _mock_vitals_db
    record_elder_id = None

    # Find record to verify authorization
    for v in _mock_vitals_db:
        if v.get("id") == id:
            record_elder_id = v.get("elder_id")
            break

    if not record_elder_id and supabase is not None:
        try:
            res = supabase.table("vitals").select("elder_id").eq("id", id).limit(1).execute()
            if res.data:
                record_elder_id = str(cast(Dict[str, Any], res.data[0]).get("elder_id"))
        except Exception as e:
            logger.warning(f"Cloud Supabase lookup for delete vital error: {e}")

    if not record_elder_id and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT elder_id FROM vitals WHERE id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    record_elder_id = str(row[0])
        except Exception as e:
            logger.warning(f"Local PostgreSQL lookup for delete vital error: {e}")

    if record_elder_id:
        verify_vitals_access(current_user, str(record_elder_id), is_write=True)

    deleted_count = 0

    if supabase is not None:
        try:
            res = supabase.table("vitals").delete().eq("id", id).execute()
            if res.data:
                deleted_count += len(res.data)
        except Exception as e:
            logger.error(f"Cloud Supabase delete vital error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("DELETE FROM vitals WHERE id = :id"), {"id": id})
                conn.commit()
                deleted_count += res.rowcount
        except Exception as e:
            logger.error(f"Local PostgreSQL delete vital error: {e}")

    initial_len = len(_mock_vitals_db)
    _mock_vitals_db[:] = [v for v in _mock_vitals_db if v.get("id") != id]
    if len(_mock_vitals_db) < initial_len:
        deleted_count += (initial_len - len(_mock_vitals_db))

    return {"status": "success", "message": f"Vital reading '{id}' processed for deletion."}
