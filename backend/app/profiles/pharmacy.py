import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import text
from app.core.security import get_current_user, require_role
from app.core.database import supabase, local_engine

logger = logging.getLogger("elderguard.profiles.pharmacy")

router = APIRouter(prefix="/profiles/pharmacy", tags=["Pharmacy Profiles"])


class PharmacyProfileCreate(BaseModel):
    pharmacy_name: Optional[str] = None
    license_id: Optional[str] = None
    address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    phone_no: Optional[str] = None


class PharmacyProfileUpdate(BaseModel):
    pharmacy_name: Optional[str] = None
    license_id: Optional[str] = None
    address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    phone_no: Optional[str] = None


class PharmacyProfileResponse(PharmacyProfileCreate):
    user_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.post("/", response_model=PharmacyProfileResponse, status_code=status.HTTP_201_CREATED)
def create_pharmacy_profile(
    payload: PharmacyProfileCreate,
    current_user: dict = Depends(require_role(["pharmacy"]))
):
    """
    Create a Pharmacy Profile for authenticated user.
    """
    user_id = current_user["user_id"]
    now_str = datetime.now(timezone.utc).isoformat()

    profile_data = {
        "user_id": user_id,
        "pharmacy_name": payload.pharmacy_name,
        "license_id": payload.license_id,
        "address": payload.address,
        "gps_lat": payload.gps_lat,
        "gps_lng": payload.gps_lng,
        "phone_no": payload.phone_no,
        "created_at": now_str,
        "updated_at": now_str,
    }

    if supabase is not None:
        try:
            supabase.table("pharmacy_profiles").insert(profile_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert pharmacy profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO pharmacy_profiles (user_id, pharmacy_name, license_id, address, gps_lat, gps_lng, phone_no, created_at, updated_at)
                        VALUES (:user_id, :pharmacy_name, :license_id, :address, :gps_lat, :gps_lng, :phone_no, :created_at, :updated_at)
                    """),
                    profile_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert pharmacy profile error: {e}")

    return PharmacyProfileResponse(**profile_data)


@router.get("/{id}", response_model=PharmacyProfileResponse)
def get_pharmacy_profile(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve Pharmacy Profile by user_id.
    """
    profile = None
    if supabase is not None:
        try:
            res = supabase.table("pharmacy_profiles").select("*").eq("user_id", id).execute()
            if res.data:
                profile = res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase get pharmacy profile error: {e}")

    if not profile and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM pharmacy_profiles WHERE user_id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    profile = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL get pharmacy profile error: {e}")

    if not profile:
        raise HTTPException(status_code=404, detail=f"Pharmacy profile for user_id '{id}' not found.")

    return PharmacyProfileResponse(**profile)


@router.put("/{id}", response_model=PharmacyProfileResponse)
def update_pharmacy_profile(
    id: str,
    payload: PharmacyProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update Pharmacy Profile.
    """
    if current_user["user_id"] != id and current_user["role"] != "pharmacy":
        raise HTTPException(status_code=403, detail="Not authorized to edit this pharmacy profile.")

    profile = get_pharmacy_profile(id, current_user)
    update_dict = payload.model_dump(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    p_data = profile.model_dump()
    p_data.update(update_dict)

    if supabase is not None:
        try:
            supabase.table("pharmacy_profiles").update(update_dict).eq("user_id", id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase update pharmacy profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                set_clauses = [f"{k} = :{k}" for k in update_dict.keys()]
                update_dict["user_id"] = id
                conn.execute(text(f"UPDATE pharmacy_profiles SET {', '.join(set_clauses)} WHERE user_id = :user_id"), update_dict)
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL update pharmacy profile error: {e}")

    return PharmacyProfileResponse(**p_data)
