from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends

from app.core.security import get_current_user
from app.emergency.schemas import (
    SOSTriggerRequest,
    SOSResolveRequest,
    SOSEventResponse,
    SOSEscalationTierResponse,
)
from app.emergency.service import (
    trigger_sos,
    acknowledge_sos,
    resolve_sos,
    get_active_sos,
    get_sos_history,
    get_escalation_policy,
)

router = APIRouter(prefix="/emergency", tags=["Emergency SOS"])


@router.post("/trigger", response_model=SOSEventResponse, status_code=status.HTTP_201_CREATED)
def trigger_emergency_sos(
    payload: SOSTriggerRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers an Emergency SOS alert. Restricted to users with role='elder'.
    """
    if current_user.get("role") != "elder":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only elders can trigger emergency SOS alerts."
        )

    elder_id = current_user["user_id"]
    return trigger_sos(
        elder_id=elder_id,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        location_accuracy_m=payload.location_accuracy_m
    )


@router.get("/active/{elder_id}", response_model=Optional[SOSEventResponse])
def get_active_emergency_sos(
    elder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns active or acknowledged SOS event for specified elder, or null if none active.
    Authorized for elder themself, linked caregiver, or linked hospital staff.
    """
    return get_active_sos(elder_id)


@router.put("/{id}/acknowledge", response_model=SOSEventResponse)
def acknowledge_emergency_sos(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Acknowledges active SOS event and notifies other responder recipients.
    Authorized for linked caregiver or hospital staff.
    """
    return acknowledge_sos(event_id=id, current_user=current_user)


@router.put("/{id}/resolve", response_model=SOSEventResponse)
def resolve_emergency_sos(
    id: str,
    payload: SOSResolveRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Resolves active/acknowledged SOS event and broadcasts completion notice.
    Authorized for linked caregiver, hospital staff, or elder.
    """
    return resolve_sos(
        event_id=id,
        current_user=current_user,
        resolution_note=payload.resolution_note
    )


@router.get("/history/{elder_id}", response_model=List[SOSEventResponse])
def get_emergency_sos_history(
    elder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns history of all SOS events for specified elder.
    """
    return get_sos_history(elder_id=elder_id, current_user=current_user)


@router.get("/escalation-policy/{elder_id}", response_model=List[SOSEscalationTierResponse])
def get_emergency_escalation_policy(
    elder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns escalation policy tiers for elder (custom policy or system default).
    """
    return get_escalation_policy(elder_id=elder_id, current_user=current_user)
