from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends

from app.core.security import get_current_user
from app.medicines.schemas import (
    MedicineCreate,
    MedicineUpdate,
    MedicineResponse,
    ReminderSessionResponse,
    TurnOffSessionRequest,
)
from app.medicines.service import (
    create_medicine,
    get_medicines_for_elder,
    update_medicine,
    deactivate_medicine,
    generate_nightly_sessions,
    generate_connected_sessions,
    get_active_session_for_elder,
    mark_item_taken,
    turn_off_session,
)

medicines_router = APIRouter(prefix="/medicines", tags=["Medicines Management"])
reminders_router = APIRouter(prefix="/reminders", tags=["Reminder Sessions"])


# --- MEDICINES MANAGEMENT ---

@medicines_router.post("/", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def api_create_medicine(
    payload: MedicineCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new medicine schedule for an elder.
    Requires role='elder', linked 'caregiver', or linked 'doctor'.
    """
    return create_medicine(payload, current_user)


@medicines_router.get("/elder/{elder_id}", response_model=List[MedicineResponse])
def api_get_medicines(
    elder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    List active medicines for an elder.
    """
    return get_medicines_for_elder(elder_id, current_user)


@medicines_router.put("/{id}", response_model=MedicineResponse)
def api_update_medicine(
    id: str,
    payload: MedicineUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing medicine schedule.
    """
    return update_medicine(id, payload, current_user)


@medicines_router.delete("/{id}")
def api_deactivate_medicine(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Deactivate a medicine schedule (soft delete).
    """
    return deactivate_medicine(id, current_user)


# --- REMINDER SESSIONS & ALARMS ---

@reminders_router.get("/active/{elder_id}", response_model=Optional[ReminderSessionResponse])
def api_get_active_session(
    elder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get active RINGING or pending session for an elder.
    """
    session = get_active_session_for_elder(elder_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"No active ringing or pending reminder session for elder '{elder_id}'.")
    return session


@reminders_router.post("/sessions/{session_id}/items/{item_id}/mark-taken", response_model=ReminderSessionResponse)
def api_mark_item_taken(
    session_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark an individual medicine item as taken.
    If all items in session are taken, automatically resolves session.
    """
    return mark_item_taken(session_id, item_id)


@reminders_router.post("/sessions/{session_id}/turn-off", response_model=ReminderSessionResponse)
def api_turn_off_session(
    session_id: str,
    payload: TurnOffSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Turn off alarm session. Sets status='RESOLVED' and resolution='taken' or 'dismissed'.
    """
    return turn_off_session(session_id, payload.resolution)


@reminders_router.post("/generate-sessions")
def api_generate_sessions(
    target_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers Nightly Session Generation job for target_date (defaults to today).
    """
    target = target_date or datetime.now(timezone.utc).date()
    created = generate_nightly_sessions(target)
    connected_created = generate_connected_sessions(target)
    all_created = created + connected_created
    return {
        "status": "success",
        "target_date": target.isoformat(),
        "sessions_created_count": len(all_created),
        "sessions": all_created
    }
