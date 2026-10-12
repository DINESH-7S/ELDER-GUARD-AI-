import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, cast
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text

from app.core.database import supabase, local_engine
from app.notifications.service import broadcast_notification
from app.emergency.service import (
    _get_tiers_for_elder,
    _get_linked_recipients,
    _get_elder_profile,
)

from app.core.config import SOS_DEMO_SECONDS

logger = logging.getLogger("elderguard.emergency.scheduler")
emergency_scheduler = AsyncIOScheduler()


def escalation_sweep():
    """
    Background sweep job for SOS auto-escalation:
    1. Query all sos_events WHERE status = 'active'.
    2. Check if next escalation tier exists and timeout/delay has elapsed since triggered_at.
    3. If due: notify next tier, increment current_escalation_tier, insert escalation log.
    """
    now_dt = datetime.now(timezone.utc)
    active_events: List[Dict[str, Any]] = []

    if supabase is not None:
        try:
            res = supabase.table("sos_events").select("*").eq("status", "active").execute()
            if res.data:
                active_events = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Error querying active SOS events from Cloud Supabase DB: {e}")

    if not active_events and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM sos_events WHERE status = 'active'"))
                active_events = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Error querying active SOS events from Local PostgreSQL: {e}")

    if not active_events:
        from app.emergency.service import _mock_sos_events_db
        active_events = [e for e in _mock_sos_events_db.values() if e.get("status") == "active"]

    for event in active_events:
        event_id = str(event["id"])
        elder_id = str(event["elder_id"])
        current_tier = int(event.get("current_escalation_tier") or 1)
        next_tier_number = current_tier + 1

        all_tiers = _get_tiers_for_elder(elder_id)
        next_tier_rows = [t for t in all_tiers if t.get("tier_number") == next_tier_number]

        if not next_tier_rows:
            continue

        triggered_at_str = event["triggered_at"]
        if isinstance(triggered_at_str, str):
            triggered_at = datetime.fromisoformat(triggered_at_str.replace("Z", "+00:00"))
        elif isinstance(triggered_at_str, datetime):
            triggered_at = triggered_at_str
        else:
            triggered_at = now_dt

        if triggered_at.tzinfo is None:
            triggered_at = triggered_at.replace(tzinfo=timezone.utc)

        delay_sec_list = []
        for t in next_tier_rows:
            ds = t.get("delay_seconds")
            tm = t.get("timeout_minutes")
            if ds is not None:
                delay_sec_list.append(int(ds))
            elif tm is not None:
                delay_sec_list.append(int(tm) * 60)
            else:
                delay_sec_list.append(0)
        delay_sec = min(delay_sec_list) if delay_sec_list else 0
        due_at = triggered_at + timedelta(seconds=delay_sec)

        if now_dt >= due_at:
            recipients = []
            for t in next_tier_rows:
                recs = _get_linked_recipients(elder_id, str(t.get("recipient_type", "secondary_caregiver")), t.get("recipient_id"))
                recipients.extend(recs)
            recipients = list(set(recipients))

            elder_prof = _get_elder_profile(elder_id) or {}
            elder_name = str(elder_prof.get("name") or f"Elder {elder_id[:6]}")
            lat = event.get("location_lat")
            lng = event.get("location_lng")
            acc = event.get("location_accuracy_m")

            if lat is not None and lng is not None:
                acc_str = f" (~{acc}m accuracy)" if acc is not None else ""
                orig_msg = f"{elder_name} triggered an SOS. Location: {lat},{lng}{acc_str}."
            else:
                orig_msg = f"{elder_name} triggered an SOS. Location unavailable. Phone: {elder_prof.get('phone_no', 'N/A')}."

            escalated_body = f"ESCALATED (Tier {next_tier_number}): no response yet — {orig_msg}"

            broadcast_id = None
            try:
                if recipients:
                    b_res = broadcast_notification(
                        recipient_ids=recipients,
                        title=f"EMERGENCY SOS - TIER {next_tier_number} ESCALATION",
                        body=escalated_body,
                        type="alert",
                        priority="CRITICAL",
                        payload={"sos_event_id": event_id, "escalation_tier": next_tier_number}
                    )
                    broadcast_id = b_res.get("broadcast_id")
            except Exception as e:
                logger.error(f"Escalation notification failed for event '{event_id}': {e}")

            from app.emergency.service import _mock_sos_events_db, _mock_sos_logs_db
            if event_id in _mock_sos_events_db:
                _mock_sos_events_db[event_id]["current_escalation_tier"] = next_tier_number

            if supabase is not None:
                try:
                    supabase.table("sos_events").update({"current_escalation_tier": next_tier_number}).eq("id", event_id).execute()
                except Exception as e:
                    logger.error(f"Cloud Supabase escalation update error: {e}")

            if local_engine is not None:
                try:
                    with local_engine.connect() as conn:
                        conn.execute(
                            text("UPDATE sos_events SET current_escalation_tier = :tier WHERE id = :id"),
                            {"tier": next_tier_number, "id": event_id}
                        )
                        conn.commit()
                except Exception as e:
                    logger.error(f"Local PostgreSQL escalation update error: {e}")

            rec_type = (next_tier_rows[0].get("recipient_type") or "secondary_caregiver") if next_tier_rows else "secondary_caregiver"
            esc_log = {
                "id": str(uuid.uuid4()),
                "sos_event_id": event_id,
                "action": f"tier_{next_tier_number}_escalated",
                "tier_number": next_tier_number,
                "recipient_type": rec_type,
                "recipient_id": recipients[0] if recipients else elder_id,
                "details": f"Escalated to Tier {next_tier_number}.",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            _mock_sos_logs_db.append(esc_log)

            if supabase is not None:
                try:
                    supabase.table("sos_event_log").insert(esc_log).execute()
                except Exception as e:
                    logger.error(f"Cloud Supabase log insert error: {e}")

            if local_engine is not None:
                try:
                    with local_engine.connect() as conn:
                        conn.execute(
                            text("""
                                INSERT INTO sos_event_log (id, sos_event_id, action, tier_number, recipient_type, recipient_id, details, created_at)
                                VALUES (:id, :sos_event_id, :action, :tier_number, :recipient_type, :recipient_id, :details, :created_at)
                            """),
                            esc_log
                        )
                        conn.commit()
                except Exception as e:
                    logger.error(f"Local PostgreSQL log insert error: {e}")

            logger.info(f"SOS Event '{event_id}' escalated to Tier {next_tier_number}.")


def start_emergency_scheduler():
    """Initializes and starts background SOS escalation sweep job using APScheduler."""
    if not emergency_scheduler.running:
        emergency_scheduler.add_job(escalation_sweep, "interval", seconds=(5 if SOS_DEMO_SECONDS > 0 else 30), id="sos_escalation_sweep")
        emergency_scheduler.start()
        logger.info("Emergency SOS Background Escalation Scheduler started.")


def shutdown_emergency_scheduler():
    """Shuts down Emergency SOS background scheduler."""
    if emergency_scheduler.running:
        emergency_scheduler.shutdown()
        logger.info("Emergency SOS Background Escalation Scheduler shut down.")
