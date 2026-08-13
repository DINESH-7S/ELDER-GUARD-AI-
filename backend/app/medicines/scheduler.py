import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text

from app.core.database import supabase, local_engine
from app.notifications.service import send_alarm_trigger, send_missed_dose_alert
from app.medicines.models import SessionStatus, SessionResolution
from app.medicines.service import _get_session_items

logger = logging.getLogger("elderguard.scheduler")
scheduler = AsyncIOScheduler()

# Track last generation date to avoid redundant work
_last_generated_date = None


def sweep_generate_sessions():
    """
    Job C — Session Generation Sweep:
    Generates reminder sessions for today from both the standalone 'medicines' table
    and the 'connected_medicines' table.
    Runs periodically to ensure sessions exist for upcoming medicine times.
    """
    global _last_generated_date
    from app.medicines.service import generate_nightly_sessions, generate_connected_sessions

    today = datetime.now(timezone.utc).date()

    # Generate from standalone medicines table
    try:
        standalone_sessions = generate_nightly_sessions(today)
        if standalone_sessions:
            logger.info(f"Generated {len(standalone_sessions)} standalone sessions for {today}")
    except Exception as e:
        logger.error(f"Error generating standalone sessions: {e}")

    # Generate from connected_medicines table
    try:
        connected_sessions = generate_connected_sessions(today)
        if connected_sessions:
            logger.info(f"Generated {len(connected_sessions)} connected sessions for {today}")
    except Exception as e:
        logger.error(f"Error generating connected sessions: {e}")

    _last_generated_date = today


def sweep_start_ringing():
    """
    Job A — Start Ringing / Retry Sweep:
    Finds sessions where (status = 'PENDING' AND scheduled_time <= now()) OR (status = 'RETRY_WAIT' AND next_retry_at <= now()).
    Sets status = 'RINGING', current_ring_started_at = now(), increments attempt_count, sends alarm trigger notification.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    sessions_to_ring = []

    if supabase is not None:
        try:
            res_pending = supabase.table("reminder_sessions").select("*").eq("status", "PENDING").lte("scheduled_time", now_iso).execute()
            res_retry = supabase.table("reminder_sessions").select("*").eq("status", "RETRY_WAIT").lte("next_retry_at", now_iso).execute()
            if res_pending.data:
                sessions_to_ring.extend(res_pending.data)
            if res_retry.data:
                sessions_to_ring.extend(res_retry.data)
        except Exception as e:
            logger.warning(f"Error querying sessions from Cloud Supabase DB: {e}")

    if not sessions_to_ring and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("""
                        SELECT * FROM reminder_sessions 
                        WHERE (status = 'PENDING' AND scheduled_time <= :now_iso) 
                           OR (status = 'RETRY_WAIT' AND next_retry_at <= :now_iso)
                    """),
                    {"now_iso": now_iso}
                )
                sessions_to_ring = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Error querying sessions from Local PostgreSQL: {e}")

    if not sessions_to_ring:
        from app.medicines.service import _mock_sessions_db
        for s in _mock_sessions_db.values():
            status_val = s.get("status")
            sched_time = s.get("scheduled_time")
            retry_time = s.get("next_retry_at")
            if (status_val == "PENDING" and sched_time and sched_time <= now_iso) or (status_val == "RETRY_WAIT" and retry_time and retry_time <= now_iso):
                sessions_to_ring.append(s)

    for session in sessions_to_ring:
        session_id = session["id"]
        elder_id = session["elder_id"]
        new_attempt = session.get("attempt_count", 0) + 1

        update_fields = {
            "status": SessionStatus.RINGING.value,
            "current_ring_started_at": now_iso,
            "attempt_count": new_attempt,
            "next_retry_at": None,
        }

        from app.medicines.service import _mock_sessions_db
        if session_id in _mock_sessions_db:
            _mock_sessions_db[session_id].update(update_fields)

        if supabase is not None:
            try:
                supabase.table("reminder_sessions").update(update_fields).eq("id", session_id).execute()
            except Exception as e:
                logger.error(f"Cloud Supabase session update error: {e}")

        if local_engine is not None:
            try:
                with local_engine.connect() as conn:
                    conn.execute(
                        text("UPDATE reminder_sessions SET status = :status, current_ring_started_at = :ring_start, attempt_count = :attempt, next_retry_at = NULL WHERE id = :id"),
                        {"status": SessionStatus.RINGING.value, "ring_start": now_iso, "attempt": new_attempt, "id": session_id}
                    )
                    conn.commit()
            except Exception as e:
                logger.error(f"Local PostgreSQL session update error: {e}")

        items = _get_session_items(session_id)
        meds_payload = [{"name": it.medicine_name, "dosage": it.dosage} for it in items]

        if len(meds_payload) <= 3:
            meds_str = ", ".join([f"{m['name']} {m['dosage']}" for m in meds_payload])
            body = f"Time for: {meds_str}"
        else:
            first_three = ", ".join([f"{m['name']} {m['dosage']}" for m in meds_payload[:3]])
            remaining = len(meds_payload) - 3
            body = f"Time for: {first_three} +{remaining} more"

        send_alarm_trigger(
            elder_id=elder_id,
            session_id=session_id,
            title="Medicine Reminder",
            body=body,
            medicines=meds_payload
        )


def sweep_check_timeouts():
    """
    Job B — Timeout Check:
    Finds sessions where status = 'RINGING' AND current_ring_started_at <= now() - 120 seconds.
    If attempt_count >= max_attempts: set status = 'AUTO_MISSED', resolved_at = now(), escalate to caregiver.
    Else: set status = 'RETRY_WAIT', next_retry_at = now() + 5 minutes.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=120)
    cutoff_iso = cutoff.isoformat()

    ringing_sessions = []

    if supabase is not None:
        try:
            res = supabase.table("reminder_sessions").select("*").eq("status", "RINGING").lte("current_ring_started_at", cutoff_iso).execute()
            if res.data:
                ringing_sessions = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase timeout query error: {e}")

    if not ringing_sessions and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM reminder_sessions WHERE status = 'RINGING' AND current_ring_started_at <= :cutoff"),
                    {"cutoff": cutoff_iso}
                )
                ringing_sessions = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL timeout query error: {e}")

    if not ringing_sessions:
        from app.medicines.service import _mock_sessions_db
        for s in _mock_sessions_db.values():
            if s.get("status") == "RINGING" and s.get("current_ring_started_at") and s.get("current_ring_started_at") <= cutoff_iso:
                ringing_sessions.append(s)

    for session in ringing_sessions:
        session_id = session["id"]
        elder_id = session["elder_id"]
        attempts = session.get("attempt_count", 1)
        max_att = session.get("max_attempts", 3)

        from app.medicines.service import _mock_sessions_db

        if attempts >= max_att:
            update_fields = {
                "status": SessionStatus.AUTO_MISSED.value,
                "resolution": SessionResolution.AUTO_MISSED.value,
                "resolved_at": now.isoformat(),
            }
            if session_id in _mock_sessions_db:
                _mock_sessions_db[session_id].update(update_fields)

            if supabase is not None:
                try:
                    supabase.table("reminder_sessions").update(update_fields).eq("id", session_id).execute()
                except Exception as e:
                    logger.error(f"Cloud Supabase update error: {e}")

            if local_engine is not None:
                try:
                    with local_engine.connect() as conn:
                        conn.execute(
                            text("UPDATE reminder_sessions SET status = :status, resolution = :resolution, resolved_at = :resolved_at WHERE id = :id"),
                            {"status": SessionStatus.AUTO_MISSED.value, "resolution": SessionResolution.AUTO_MISSED.value, "resolved_at": now.isoformat(), "id": session_id}
                        )
                        conn.commit()
                except Exception as e:
                    logger.error(f"Local PostgreSQL update error: {e}")

            items = _get_session_items(session_id)
            meds_payload = [{"name": it.medicine_name, "dosage": it.dosage} for it in items]
            send_missed_dose_alert(
                elder_id=elder_id,
                session_id=session_id,
                medicines=meds_payload,
                caregiver_ids=[f"caregiver_of_{elder_id}"]
            )
        else:
            next_retry = now + timedelta(minutes=5)
            update_fields = {
                "status": SessionStatus.RETRY_WAIT.value,
                "next_retry_at": next_retry.isoformat(),
            }
            if session_id in _mock_sessions_db:
                _mock_sessions_db[session_id].update(update_fields)

            if supabase is not None:
                try:
                    supabase.table("reminder_sessions").update(update_fields).eq("id", session_id).execute()
                except Exception as e:
                    logger.error(f"Cloud Supabase update error: {e}")

            if local_engine is not None:
                try:
                    with local_engine.connect() as conn:
                        conn.execute(
                            text("UPDATE reminder_sessions SET status = :status, next_retry_at = :next_retry WHERE id = :id"),
                            {"status": SessionStatus.RETRY_WAIT.value, "next_retry": next_retry.isoformat(), "id": session_id}
                        )
                        conn.commit()
                except Exception as e:
                    logger.error(f"Local PostgreSQL update error: {e}")


def start_scheduler():
    """Initializes and starts background sweep jobs using APScheduler."""
    if not scheduler.running:
        # Job C: Generate sessions every 60 seconds (handles both standalone + connected medicines)
        scheduler.add_job(sweep_generate_sessions, "interval", seconds=60, id="sweep_generate_sessions")
        # Job A: Start ringing for sessions whose time has arrived
        scheduler.add_job(sweep_start_ringing, "interval", seconds=15, id="sweep_start_ringing")
        # Job B: Check for timed-out ringing sessions
        scheduler.add_job(sweep_check_timeouts, "interval", seconds=15, id="sweep_check_timeouts")
        scheduler.start()
        logger.info("Medicine Reminder Background Scheduler started successfully.")


def shutdown_scheduler():
    """Shuts down background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Medicine Reminder Background Scheduler shut down.")

