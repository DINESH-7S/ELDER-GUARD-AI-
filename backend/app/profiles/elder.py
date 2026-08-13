import logging
import uuid
from typing import Optional, Dict, Any
from datetime import date, datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import text
from app.core.security import get_current_user, require_role
from app.core.database import supabase, local_engine

logger = logging.getLogger("elderguard.profiles.elder")

router = APIRouter(prefix="/profiles/elder", tags=["Elder Profiles"])


class ElderProfileCreate(BaseModel):
    name: str = Field(..., min_length=1)
    profile_pic_url: Optional[str] = None
    nickname: Optional[str] = None
    age_or_dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    primary_language: Optional[str] = None
    phone_no: Optional[str] = None
    home_address: Optional[str] = None
    whatsapp_no: Optional[str] = None
    email: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bed_gap: Optional[str] = None
    caregiver_id: Optional[str] = None


class ElderProfileUpdate(BaseModel):
    name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    nickname: Optional[str] = None
    age_or_dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    primary_language: Optional[str] = None
    phone_no: Optional[str] = None
    home_address: Optional[str] = None
    whatsapp_no: Optional[str] = None
    email: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bed_gap: Optional[str] = None
    caregiver_id: Optional[str] = None


class ElderProfileResponse(ElderProfileCreate):
    user_id: str
    elder_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.post("/", response_model=ElderProfileResponse, status_code=status.HTTP_201_CREATED)
def create_elder_profile(
    payload: ElderProfileCreate,
    current_user: dict = Depends(require_role(["elder"]))
):
    """
    Create an Elder Profile for the authenticated user.
    """
    user_id = current_user["user_id"]
    now_str = datetime.now(timezone.utc).isoformat()

    profile_data = {
        "user_id": user_id,
        "elder_id": f"EG-{uuid.uuid4().hex[:8].upper()}",
        "profile_pic_url": payload.profile_pic_url,
        "name": payload.name,
        "nickname": payload.nickname,
        "age_or_dob": payload.age_or_dob.isoformat() if payload.age_or_dob else None,
        "gender": payload.gender,
        "blood_group": payload.blood_group,
        "primary_language": payload.primary_language,
        "phone_no": payload.phone_no,
        "home_address": payload.home_address,
        "whatsapp_no": payload.whatsapp_no,
        "email": payload.email,
        "height_cm": payload.height_cm,
        "weight_kg": payload.weight_kg,
        "bed_gap": payload.bed_gap,
        "caregiver_id": payload.caregiver_id,
        "created_at": now_str,
        "updated_at": now_str,
    }

    if supabase is not None:
        try:
            supabase.table("elder_profiles").insert(profile_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert elder profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO elder_profiles (user_id, elder_id, profile_pic_url, name, nickname, age_or_dob, gender, blood_group, primary_language, phone_no, home_address, whatsapp_no, email, height_cm, weight_kg, bed_gap, caregiver_id, created_at, updated_at)
                        VALUES (:user_id, :elder_id, :profile_pic_url, :name, :nickname, :age_or_dob, :gender, :blood_group, :primary_language, :phone_no, :home_address, :whatsapp_no, :email, :height_cm, :weight_kg, :bed_gap, :caregiver_id, :created_at, :updated_at)
                    """),
                    profile_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert elder profile error: {e}")

    return ElderProfileResponse(**profile_data)


@router.get("/{id}", response_model=ElderProfileResponse)
def get_elder_profile(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve Elder Profile by user_id.
    """
    profile = None
    if supabase is not None:
        try:
            res = supabase.table("elder_profiles").select("*").eq("user_id", id).execute()
            if res.data:
                profile = res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase get elder profile error: {e}")

    if not profile and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM elder_profiles WHERE user_id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    profile = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL get elder profile error: {e}")

    if not profile:
        raise HTTPException(status_code=404, detail=f"Elder profile for user_id '{id}' not found.")

    return ElderProfileResponse(**profile)


@router.put("/{id}", response_model=ElderProfileResponse)
def update_elder_profile(
    id: str,
    payload: ElderProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update Elder Profile.
    """
    if current_user["user_id"] != id and current_user["role"] not in ["elder", "caregiver"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this elder profile.")

    profile = get_elder_profile(id, current_user)

    update_dict = payload.model_dump(exclude_unset=True)
    if "age_or_dob" in update_dict and isinstance(update_dict["age_or_dob"], date):
        update_dict["age_or_dob"] = update_dict["age_or_dob"].isoformat()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    p_data = profile.model_dump()
    p_data.update(update_dict)

    if supabase is not None:
        try:
            supabase.table("elder_profiles").update(update_dict).eq("user_id", id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase update elder profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                set_clauses = [f"{k} = :{k}" for k in update_dict.keys()]
                update_dict["user_id"] = id
                conn.execute(text(f"UPDATE elder_profiles SET {', '.join(set_clauses)} WHERE user_id = :user_id"), update_dict)
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL update elder profile error: {e}")

    return ElderProfileResponse(**p_data)
