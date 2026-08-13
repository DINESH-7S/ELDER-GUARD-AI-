import logging
from typing import Dict, Any, List, Optional
from datetime import date

from app.core.database import supabase

logger = logging.getLogger("elderguard.appointments.queue")

# In-memory queue counters per (doctor_id, date_str)
_queue_counters: Dict[str, int] = {}


def generate_queue_token(doctor_id: str, appt_date: date) -> str:
    """Generates daily sequential token e.g., Q-001, Q-002 per doctor."""
    key = f"{doctor_id}:{appt_date.isoformat()}"
    current_val = _queue_counters.get(key, 0) + 1
    _queue_counters[key] = current_val
    return f"Q-{current_val:03d}"
