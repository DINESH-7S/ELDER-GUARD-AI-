import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text

from app.core.database import supabase, local_engine
from app.notifications.service import broadcast_notification
from app.appointments.constants import AppointmentStatus, TelemedStatus
from app.appointments.service import enforce_transition
from app.appointments.telemedicine import update_telemed_status

logger = logging.getLogger("elderguard.appointments.scheduler")
appointments_scheduler = AsyncIOScheduler()


def sweep_24h_reminders():
    """Finds appointments starting in ~24h and dispatches reminders."""
    now_dt = datetime.now(timezone.utc)
    target_dt = now_dt + timedelta(hours=24)
    target_date_str = target_dt.date().isoformat()

    appts = []
    if supabase is not None:
        try:
            res = supabase.table("appointments").select("*").in_("status", ["SCHEDULED", "CONFIRMED"]).eq("appointment_date", target_date_str).execute()
            if res.data:
                appts = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase 24h query error: {e}")

    if not appts and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM appointments WHERE status IN ('SCHEDULED', 'CONFIRMED') AND appointment_date = :target_date"),
                    {"target_date": target_date_str}
                )
                appts = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL 24h query error: {e}")

    for appt in appts:
        try:
            broadcast_notification(
                recipient_ids=[appt["elder_id"]],
                title="Appointment Reminder (24h)",
                body=f"Reminder: You have an appointment tomorrow at {appt['start_time']}.",
                type="info",
                priority="NORMAL",
                payload={"appointment_id": appt["id"]}
            )
        except Exception:
            pass


def sweep_2h_reminders():
    """Finds appointments starting in ~2h and dispatches urgent reminders."""
    now_dt = datetime.now(timezone.utc)
    today_str = now_dt.date().isoformat()

    appts = []
    if supabase is not None:
        try:
            res = supabase.table("appointments").select("*").in_("status", ["SCHEDULED", "CONFIRMED"]).eq("appointment_date", today_str).execute()
            if res.data:
                appts = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase 2h query error: {e}")

    if not appts and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM appointments WHERE status IN ('SCHEDULED', 'CONFIRMED') AND appointment_date = :today_str"),
                    {"today_str": today_str}
                )
                appts = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL 2h query error: {e}")

    for appt in appts:
        try:
            broadcast_notification(
                recipient_ids=[appt["elder_id"]],
                title="Appointment Starting Soon (2h)",
                body=f"Your appointment starts in 2 hours at {appt['start_time']}.",
                type="alert",
                priority="HIGH",
                payload={"appointment_id": appt["id"]}
            )
        except Exception:
            pass


def sweep_no_show():
    """Finds un-attended appointments past end_time + 60m and marks them NO_SHOW."""
    now_dt = datetime.now(timezone.utc)
    today_str = now_dt.date().isoformat()

    appts = []
    if supabase is not None:
        try:
            res = supabase.table("appointments").select("*").in_("status", ["SCHEDULED", "CONFIRMED", "CHECKED_IN"]).execute()
            if res.data:
                appts = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase no_show query error: {e}")

    if not appts and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM appointments WHERE status IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN')"))
                appts = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL no_show query error: {e}")

    for appt in appts:
        try:
            appt_d = date.fromisoformat(str(appt["appointment_date"]))
            et_h, et_m = map(int, str(appt["end_time"]).split(":")[:2])
            end_dt = datetime.combine(appt_d, datetime.min.time().replace(hour=et_h, minute=et_m), tzinfo=timezone.utc)
            
            if now_dt >= end_dt + timedelta(minutes=60):
                enforce_transition(appt, AppointmentStatus.NO_SHOW, actor_id=None, note="Auto-marked NO_SHOW by background scheduler.")
                broadcast_notification(
                    recipient_ids=[appt["elder_id"], appt["doctor_id"]],
                    title="Appointment Missed",
                    body="Appointment was marked as No-Show.",
                    type="alert",
                    priority="HIGH",
                    payload={"appointment_id": appt["id"]}
                )
        except Exception:
            pass


def sweep_telemed_expiry():
    """Finds expired telemedicine sessions and marks status EXPIRED."""
    now_iso = datetime.now(timezone.utc).isoformat()
    sessions = []
    if supabase is not None:
        try:
            res = supabase.table("telemed_sessions").select("*").in_("status", [TelemedStatus.CREATED.value, TelemedStatus.ACTIVE.value]).lte("expires_at", now_iso).execute()
            if res.data:
                sessions = res.data
        except Exception as e:
            logger.warning(f"Cloud Supabase telemed expiry query error: {e}")

    if not sessions and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM telemed_sessions WHERE status IN ('CREATED', 'ACTIVE') AND expires_at <= :now_iso"),
                    {"now_iso": now_iso}
                )
                sessions = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL telemed expiry query error: {e}")

    for session in sessions:
        update_telemed_status(session["appointment_id"], TelemedStatus.EXPIRED)


def start_appointments_scheduler():
    """Starts background appointment scheduler jobs."""
    if not appointments_scheduler.running:
        appointments_scheduler.add_job(sweep_24h_reminders, "interval", hours=1, id="sweep_24h_reminders")
        appointments_scheduler.add_job(sweep_2h_reminders, "interval", minutes=15, id="sweep_2h_reminders")
        appointments_scheduler.add_job(sweep_no_show, "interval", minutes=15, id="sweep_no_show")
        appointments_scheduler.add_job(sweep_telemed_expiry, "interval", minutes=15, id="sweep_telemed_expiry")
        appointments_scheduler.start()
        logger.info("Appointments Background Scheduler started.")


def shutdown_appointments_scheduler():
    """Shuts down appointments background scheduler."""
    if appointments_scheduler.running:
        appointments_scheduler.shutdown()
        logger.info("Appointments Background Scheduler shut down.")
