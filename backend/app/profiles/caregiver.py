import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import text
from app.core.security import get_current_user, require_role
from app.core.database import supabase, local_engine

logger = logging.getLogger("elderguard.profiles.caregiver")

router = APIRouter(prefix="/profiles/caregiver", tags=["Caregiver Profiles"])


class CaregiverProfileCreate(BaseModel):
    name: Optional[str] = None
    phone_no: Optional[str] = None
    email: Optional[str] = None
    relationship_to_elder: Optional[str] = None
    linked_elder_id: Optional[str] = None
    profile_pic_url: Optional[str] = None


class CaregiverProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone_no: Optional[str] = None
    email: Optional[str] = None
    relationship_to_elder: Optional[str] = None
    linked_elder_id: Optional[str] = None
    profile_pic_url: Optional[str] = None


class CaregiverProfileResponse(CaregiverProfileCreate):
    user_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.post("/", response_model=CaregiverProfileResponse, status_code=status.HTTP_201_CREATED)
def create_caregiver_profile(
    payload: CaregiverProfileCreate,
    current_user: dict = Depends(require_role(["caregiver"]))
):
    """
    Create a Caregiver Profile for authenticated user.
    """
    user_id = current_user["user_id"]
    now_str = datetime.now(timezone.utc).isoformat()

    profile_data = {
        "user_id": user_id,
        "name": payload.name,
        "phone_no": payload.phone_no,
        "email": payload.email,
        "relationship_to_elder": payload.relationship_to_elder,
        "linked_elder_id": payload.linked_elder_id,
        "profile_pic_url": payload.profile_pic_url,
        "created_at": now_str,
        "updated_at": now_str,
    }

    if supabase is not None:
        try:
            supabase.table("caregiver_profiles").insert(profile_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert caregiver profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO caregiver_profiles (user_id, name, phone_no, email, relationship_to_elder, linked_elder_id, profile_pic_url, created_at, updated_at)
                        VALUES (:user_id, :name, :phone_no, :email, :relationship_to_elder, :linked_elder_id, :profile_pic_url, :created_at, :updated_at)
                    """),
                    profile_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert caregiver profile error: {e}")

    return CaregiverProfileResponse(**profile_data)


@router.get("/{id}", response_model=CaregiverProfileResponse)
def get_caregiver_profile(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve Caregiver Profile by user_id.
    """
    profile = None
    if supabase is not None:
        try:
            res = supabase.table("caregiver_profiles").select("*").eq("user_id", id).execute()
            if res.data:
                profile = res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase get caregiver profile error: {e}")

    if not profile and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM caregiver_profiles WHERE user_id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    profile = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL get caregiver profile error: {e}")

    if not profile:
        raise HTTPException(status_code=404, detail=f"Caregiver profile for user_id '{id}' not found.")

    return CaregiverProfileResponse(**profile)


@router.put("/{id}", response_model=CaregiverProfileResponse)
def update_caregiver_profile(
    id: str,
    payload: CaregiverProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update Caregiver Profile.
    """
    if current_user["user_id"] != id and current_user["role"] != "caregiver":
        raise HTTPException(status_code=403, detail="Not authorized to edit this caregiver profile.")

    profile = get_caregiver_profile(id, current_user)
    update_dict = payload.model_dump(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    p_data = profile.model_dump()
    p_data.update(update_dict)

    if supabase is not None:
        try:
            supabase.table("caregiver_profiles").update(update_dict).eq("user_id", id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase update caregiver profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                set_clauses = [f"{k} = :{k}" for k in update_dict.keys()]
                update_dict["user_id"] = id
                conn.execute(text(f"UPDATE caregiver_profiles SET {', '.join(set_clauses)} WHERE user_id = :user_id"), update_dict)
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL update caregiver profile error: {e}")

    return CaregiverProfileResponse(**p_data)
