import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import text
from app.core.security import get_current_user, require_role
from app.core.database import supabase, local_engine

logger = logging.getLogger("elderguard.profiles.hospital")

router = APIRouter(prefix="/profiles/hospital", tags=["Hospital Profiles"])


class HospitalProfileCreate(BaseModel):
    office_name: Optional[str] = None
    license_id: Optional[str] = None
    address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    phone_no: Optional[str] = None


class HospitalProfileUpdate(BaseModel):
    office_name: Optional[str] = None
    license_id: Optional[str] = None
    address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    phone_no: Optional[str] = None


class HospitalProfileResponse(HospitalProfileCreate):
    user_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.post("/", response_model=HospitalProfileResponse, status_code=status.HTTP_201_CREATED)
def create_hospital_profile(
    payload: HospitalProfileCreate,
    current_user: dict = Depends(require_role(["hospital"]))
):
    """
    Create a Hospital Profile for authenticated user.
    """
    user_id = current_user["user_id"]
    now_str = datetime.now(timezone.utc).isoformat()

    profile_data = {
        "user_id": user_id,
        "office_name": payload.office_name,
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
            supabase.table("hospital_profiles").insert(profile_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert hospital profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                cols = {row[1] for row in conn.execute(text("PRAGMA table_info(hospital_profiles)"))}
                db_payload = dict(profile_data)
                if "hospital_name" in cols:
                    db_payload["hospital_name"] = payload.office_name or "Hospital"
                if "license_no" in cols:
                    db_payload["license_no"] = payload.license_id
                if "contact_phone" in cols:
                    db_payload["contact_phone"] = payload.phone_no
                insert_cols = [col for col in db_payload.keys() if col in cols]
                conn.execute(
                    text(f"INSERT INTO hospital_profiles ({', '.join(insert_cols)}) VALUES ({', '.join([f':{col}' for col in insert_cols])})"),
                    {col: db_payload[col] for col in insert_cols}
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert hospital profile error: {e}")

    return HospitalProfileResponse(**profile_data)


@router.get("/{id}", response_model=HospitalProfileResponse)
def get_hospital_profile(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve Hospital Profile by user_id.
    """
    profile = None
    if supabase is not None:
        try:
            res = supabase.table("hospital_profiles").select("*").eq("user_id", id).execute()
            if res.data:
                profile = res.data[0]
        except Exception as e:
            logger.warning(f"Cloud Supabase get hospital profile error: {e}")

    if not profile and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM hospital_profiles WHERE user_id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    profile = dict(row._mapping)
                    profile["office_name"] = profile.get("office_name") or profile.get("hospital_name")
                    profile["license_id"] = profile.get("license_id") or profile.get("license_no")
                    profile["phone_no"] = profile.get("phone_no") or profile.get("contact_phone")
        except Exception as e:
            logger.warning(f"Local PostgreSQL get hospital profile error: {e}")

    if not profile:
        raise HTTPException(status_code=404, detail=f"Hospital profile for user_id '{id}' not found.")

    return HospitalProfileResponse(**profile)


@router.put("/{id}", response_model=HospitalProfileResponse)
def update_hospital_profile(
    id: str,
    payload: HospitalProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update Hospital Profile.
    """
    if current_user["user_id"] != id and current_user["role"] != "hospital":
        raise HTTPException(status_code=403, detail="Not authorized to edit this hospital profile.")

    profile = get_hospital_profile(id, current_user)
    update_dict = payload.model_dump(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    p_data = profile.model_dump()
    p_data.update(update_dict)

    if supabase is not None:
        try:
            supabase.table("hospital_profiles").update(update_dict).eq("user_id", id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase update hospital profile error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                cols = {row[1] for row in conn.execute(text("PRAGMA table_info(hospital_profiles)"))}
                db_update = dict(update_dict)
                if "hospital_name" in cols and "office_name" in update_dict:
                    db_update["hospital_name"] = update_dict["office_name"] or "Hospital"
                if "license_no" in cols and "license_id" in update_dict:
                    db_update["license_no"] = update_dict["license_id"]
                if "contact_phone" in cols and "phone_no" in update_dict:
                    db_update["contact_phone"] = update_dict["phone_no"]
                db_update = {key: value for key, value in db_update.items() if key in cols}
                set_clauses = [f"{k} = :{k}" for k in db_update.keys()]
                db_update["user_id"] = id
                conn.execute(text(f"UPDATE hospital_profiles SET {', '.join(set_clauses)} WHERE user_id = :user_id"), db_update)
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL update hospital profile error: {e}")

    return HospitalProfileResponse(**p_data)
