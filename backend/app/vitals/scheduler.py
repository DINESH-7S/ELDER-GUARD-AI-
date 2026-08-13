import random
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text

from app.core.database import local_engine, supabase
from app.connected.realtime import elder_room_manager
from app.connected.storage import dumps, new_id, now_iso, parse_vital

logger = logging.getLogger("elderguard.vitals.scheduler")
vitals_scheduler = AsyncIOScheduler()


def get_target_elder_ids() -> List[str]:
    """Finds all active elder IDs to simulate vitals for."""
    elder_ids = set(["demo-elder-001", "demo_elder", "e1", "user_elder_1"])
    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                # Query elders from users table
                rows = conn.execute(text("SELECT id FROM users WHERE role = 'elder'")).fetchall()
                for r in rows:
                    if r[0]:
                        elder_ids.add(r[0])
                # Query elders from connected_medicines
                rows2 = conn.execute(text("SELECT DISTINCT elder_id FROM connected_medicines")).fetchall()
                for r in rows2:
                    if r[0]:
                        elder_ids.add(r[0])
                # Query elders from elder_caregiver_links
                rows3 = conn.execute(text("SELECT DISTINCT elder_id FROM elder_caregiver_links")).fetchall()
                for r in rows3:
                    if r[0]:
                        elder_ids.add(r[0])
        except Exception as e:
            logger.warning(f"Error fetching elder IDs for vitals scheduler: {e}")
    return list(elder_ids)


def _log_and_emit_vital(elder_id: str, vital_type: str, value_dict: Dict[str, Any], unit: str):
    """Helper to log vital to connected_vitals and emit real-time WebSocket event."""
    vital_id = new_id()
    recorded_at = now_iso()
    created_at = recorded_at

    row = {
        "id": vital_id,
        "elder_id": elder_id,
        "type": vital_type,
        "value": dumps(value_dict),
        "unit": unit,
        "recorded_at": recorded_at,
        "source": "sensor_simulation",
        "flagged": 0,
        "created_at": created_at,
    }

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO connected_vitals (id, elder_id, type, value, unit, recorded_at, source, flagged, created_at)
                        VALUES (:id, :elder_id, :type, :value, :unit, :recorded_at, :source, :flagged, :created_at)
                    """),
                    row
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Local DB connected_vitals insert error: {e}")

    # Format for realtime payload
    parsed = {
        "id": vital_id,
        "elder_id": elder_id,
        "type": vital_type,
        "value": value_dict,
        "unit": unit,
        "recorded_at": recorded_at,
        "source": "sensor_simulation",
        "flagged": False,
        "created_at": created_at,
    }

    # Emit real-time WebSocket event
    elder_room_manager.emit_background(elder_id, "vital:logged", parsed)


def sweep_bp_and_heart_rate_5s():
    """
    1. BP and Heart Rate update every 5 seconds.
    """
    for elder_id in get_target_elder_ids():
        sys_bp = random.randint(116, 126)
        dia_bp = random.randint(76, 84)
        pulse = random.randint(68, 78)

        # Log Blood Pressure
        _log_and_emit_vital(
            elder_id=elder_id,
            vital_type="bp",
            value_dict={"systolic": sys_bp, "diastolic": dia_bp},
            unit="mmHg"
        )
        # Log Heart Rate
        _log_and_emit_vital(
            elder_id=elder_id,
            vital_type="heart_rate",
            value_dict={"value": pulse},
            unit="bpm"
        )


def sweep_spo2_5m():
    """
    3. Oxygen Level (SpO2) changes every 5 mins.
    """
    for elder_id in get_target_elder_ids():
        spo2 = round(random.uniform(96.5, 99.0), 1)
        _log_and_emit_vital(
            elder_id=elder_id,
            vital_type="spo2",
            value_dict={"value": spo2},
            unit="%"
        )


def sweep_blood_sugar_15m():
    """
    2. Blood sugar changes every 15 mins.
    """
    for elder_id in get_target_elder_ids():
        sugar = round(random.uniform(95.0, 115.0), 1)
        _log_and_emit_vital(
            elder_id=elder_id,
            vital_type="sugar",
            value_dict={"value": sugar},
            unit="mg/dL"
        )


def sweep_weight_and_sleep_daily():
    """
    4. Weight changes everyday.
    5. Sleep Duration changes everyday.
    """
    for elder_id in get_target_elder_ids():
        weight = round(random.uniform(64.5, 65.8), 1)
        sleep = round(random.uniform(7.0, 8.2), 1)

        _log_and_emit_vital(
            elder_id=elder_id,
            vital_type="weight",
            value_dict={"value": weight},
            unit="kg"
        )
        _log_and_emit_vital(
            elder_id=elder_id,
            vital_type="sleep",
            value_dict={"value": sleep},
            unit="hrs"
        )


def start_vitals_scheduler():
    """Initializes and starts background vitals simulation schedules."""
    if not vitals_scheduler.running:
        # Run initial seed sweep for weight & sleep & vitals
        try:
            sweep_weight_and_sleep_daily()
            sweep_blood_sugar_15m()
            sweep_spo2_5m()
            sweep_bp_and_heart_rate_5s()
        except Exception as e:
            logger.warning(f"Initial vitals seed error: {e}")

        # 1. BP and Heart Rate: 5 seconds
        vitals_scheduler.add_job(sweep_bp_and_heart_rate_5s, "interval", seconds=5, id="vitals_bp_hr_5s")
        # 3. SpO2 Oxygen Level: 5 minutes (300s)
        vitals_scheduler.add_job(sweep_spo2_5m, "interval", seconds=300, id="vitals_spo2_5m")
        # 2. Blood Sugar: 15 minutes (900s)
        vitals_scheduler.add_job(sweep_blood_sugar_15m, "interval", seconds=900, id="vitals_sugar_15m")
        # 4 & 5. Weight & Sleep Duration: 24 hours (86400s)
        vitals_scheduler.add_job(sweep_weight_and_sleep_daily, "interval", seconds=86400, id="vitals_daily_24h")

        vitals_scheduler.start()
        logger.info("Realtime Vitals Background Scheduler started successfully (5s BP/HR, 5m SpO2, 15m Sugar, 24h Weight/Sleep).")


def shutdown_vitals_scheduler():
    """Shuts down background vitals scheduler."""
    if vitals_scheduler.running:
        vitals_scheduler.shutdown()
        logger.info("Realtime Vitals Background Scheduler shut down.")
