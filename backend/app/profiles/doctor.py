import logging
import json
from typing import Optional, Dict, Any, List, cast
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import text
from app.core.security import get_current_user, require_role
from app.core.database import supabase, local_engine

logger = logging.getLogger("elderguard.profiles.doctor")

router = APIRouter(prefix="/profiles/doctor", tags=["Doctor Profiles"])

_mock_doctor_profiles: List[Dict[str, Any]] = []


class DoctorProfileCreate(BaseModel):
    name: Optional[str] = None
    professional_title: Optional[str] = None
    gender: Optional[str] = None
    profile_pic_url: Optional[str] = None
    license_number: Optional[str] = None
    medical_council_board: Optional[str] = None
    years_of_experience: Optional[int] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None


class DoctorProfileUpdate(BaseModel):
    name: Optional[str] = None
    professional_title: Optional[str] = None
    gender: Optional[str] = None
    profile_pic_url: Optional[str] = None
    license_number: Optional[str] = None
    medical_council_board: Optional[str] = None
    years_of_experience: Optional[int] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None


class DoctorProfileResponse(DoctorProfileCreate):
    user_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


def _doctor_user_accounts() -> List[Dict[str, Any]]:
    accounts: List[Dict[str, Any]] = []

    if supabase is not None:
        try:
            res = supabase.table("users").select("id,email,phone_no,created_at,updated_at").eq("role", "doctor").execute()
            if res.data:
                accounts.extend(cast(List[Dict[str, Any]], res.data))
        except Exception as e:
            logger.warning(f"Cloud Supabase doctor user account lookup error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT id, email, phone_no, created_at, updated_at FROM users WHERE role = 'doctor'"))
                accounts.extend([dict(row._mapping) for row in res.fetchall()])
        except Exception as e:
            logger.warning(f"Local PostgreSQL doctor user account lookup error: {e}")

    return accounts


def _doctor_user_account(user_id: str) -> Optional[Dict[str, Any]]:
    for account in _doctor_user_accounts():
        if str(account.get("id")) == str(user_id):
            return account
    return None


def _profile_from_user_account(account: Dict[str, Any]) -> Dict[str, Any]:
    user_id = str(account["id"])
    return {
        "user_id": user_id,
        "name": account.get("email") or account.get("phone_no") or f"Doctor {user_id[:6]}",
        "professional_title": None,
        "gender": None,
        "profile_pic_url": None,
        "license_number": None,
        "medical_council_board": None,
        "years_of_experience": None,
        "specialization": None,
        "qualification": None,
        "working_hours": None,
        "created_at": str(account.get("created_at")) if account.get("created_at") else None,
        "updated_at": str(account.get("updated_at")) if account.get("updated_at") else None,
    }


def fetch_all_doctors_internal() -> List[Dict[str, Any]]:
    docs_map: Dict[str, Dict[str, Any]] = {}
    
    for d in _mock_doctor_profiles:
        docs_map[d["user_id"]] = dict(d)

    for account in _doctor_user_accounts():
        docs_map[str(account["id"])] = _profile_from_user_account(account)

    # 2. Supabase DB
    if supabase is not None:
        try:
            res = supabase.table("doctor_profiles").select("*").execute()
            if res.data:
                for row in res.data:
                    docs_map[row["user_id"]] = dict(row)
        except Exception as e:
            logger.warning(f"Cloud Supabase fetch all doctors error: {e}")

    # 3. Local Engine
    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM doctor_profiles"))
                for row in res.fetchall():
                    r_dict = dict(row._mapping)
                    docs_map[r_dict["user_id"]] = r_dict
        except Exception as e:
            logger.warning(f"Local PostgreSQL fetch all doctors error: {e}")

    return list(docs_map.values())


@router.get("/", response_model=List[DoctorProfileResponse])
@router.get("/all", response_model=List[DoctorProfileResponse])
def list_doctor_profiles(
    specialization: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve all registered Doctor Profiles with optional specialization filter.
    """
    all_docs = fetch_all_doctors_internal()
    if specialization:
        spec_clean = specialization.strip().lower()
        all_docs = [d for d in all_docs if spec_clean in (d.get("specialization") or "").lower()]

    return [DoctorProfileResponse.model_validate(d) for d in all_docs]


@router.post("/", response_model=DoctorProfileResponse, status_code=status.HTTP_201_CREATED)
def create_doctor_profile(
    payload: DoctorProfileCreate,
    current_user: dict = Depends(require_role(["doctor"]))
):
    """
    Create a Doctor Profile for authenticated user.
    """
    user_id = current_user["user_id"]
    now_str = datetime.now(timezone.utc).isoformat()

    profile_data = {
        "user_id": user_id,
        "name": payload.name or current_user.get("name") or f"Doctor {user_id[:6]}",
        "professional_title": payload.professional_title,
        "gender": payload.gender,
        "profile_pic_url": payload.profile_pic_url,
        "license_number": payload.license_number,
        "medical_council_board": payload.medical_council_board,
        "years_of_experience": payload.years_of_experience,
        "specialization": payload.specialization,
        "qualification": payload.qualification,
        "working_hours": payload.working_hours,
        "created_at": now_str,
        "updated_at": now_str,
    }

    # Upsert into mock memory list
    existing_idx = next((i for i, p in enumerate(_mock_doctor_profiles) if p.get("user_id") == user_id), None)
    if existing_idx is not None:
        _mock_doctor_profiles[existing_idx] = profile_data
    else:
        _mock_doctor_profiles.append(profile_data)

    if supabase is not None:
        try:
            supabase.table("doctor_profiles").insert(profile_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase insert doctor profile error: {e}")

    if local_engine is not None:
        try:
            db_payload = dict(profile_data)
            db_payload["working_hours"] = json.dumps(db_payload["working_hours"])
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO doctor_profiles (user_id, name, professional_title, gender, profile_pic_url, license_number, medical_council_board, years_of_experience, specialization, qualification, working_hours, created_at, updated_at)
                        VALUES (:user_id, :name, :professional_title, :gender, :profile_pic_url, :license_number, :medical_council_board, :years_of_experience, :specialization, :qualification, :working_hours, :created_at, :updated_at)
                        ON CONFLICT (user_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            professional_title = EXCLUDED.professional_title,
                            specialization = EXCLUDED.specialization,
                            qualification = EXCLUDED.qualification,
                            updated_at = EXCLUDED.updated_at
                    """),
                    db_payload
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL insert doctor profile error: {e}")

    return DoctorProfileResponse.model_validate(profile_data)


@router.get("/{id}", response_model=DoctorProfileResponse)
def get_doctor_profile(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieve Doctor Profile by user_id.
    """
    profile: Optional[Dict[str, Any]] = None
    if supabase is not None:
        try:
            res = supabase.table("doctor_profiles").select("*").eq("user_id", id).execute()
            if res.data:
                profile = cast(Dict[str, Any], res.data[0])
        except Exception as e:
            logger.warning(f"Cloud Supabase get doctor profile error: {e}")

    if not profile and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM doctor_profiles WHERE user_id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    profile = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL get doctor profile error: {e}")

    if not profile:
        for p in _mock_doctor_profiles:
            if p.get("user_id") == id:
                profile = p
                break

    if not profile:
        account = _doctor_user_account(id)
        profile = _profile_from_user_account(account) if account else {
            "user_id": id,
            "name": current_user.get("name") or f"Doctor {id[:6]}",
            "professional_title": None,
            "gender": None,
            "profile_pic_url": None,
            "license_number": None,
            "medical_council_board": None,
            "years_of_experience": None,
            "specialization": None,
            "qualification": None,
            "working_hours": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    return DoctorProfileResponse.model_validate(profile)


@router.put("/{id}", response_model=DoctorProfileResponse)
def update_doctor_profile(
    id: str,
    payload: DoctorProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update Doctor Profile for given user_id.
    """
    profile_obj = get_doctor_profile(id, current_user)
    update_dict = payload.model_dump(exclude_unset=True)
    now_iso = datetime.now(timezone.utc).isoformat()
    update_dict["updated_at"] = now_iso

    p_data = profile_obj.model_dump()
    p_data.update(update_dict)

    # Upsert in memory list
    existing_idx = next((i for i, p in enumerate(_mock_doctor_profiles) if p.get("user_id") == id), None)
    if existing_idx is not None:
        _mock_doctor_profiles[existing_idx].update(update_dict)
    else:
        _mock_doctor_profiles.append(p_data)

    if supabase is not None:
        try:
            supabase.table("doctor_profiles").upsert(p_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase update doctor profile error: {e}")

    if local_engine is not None:
        try:
            db_update = dict(p_data)
            if "working_hours" in db_update and isinstance(db_update["working_hours"], dict):
                db_update["working_hours"] = json.dumps(db_update["working_hours"])
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO doctor_profiles (user_id, name, professional_title, gender, profile_pic_url, license_number, medical_council_board, years_of_experience, specialization, qualification, working_hours, created_at, updated_at)
                        VALUES (:user_id, :name, :professional_title, :gender, :profile_pic_url, :license_number, :medical_council_board, :years_of_experience, :specialization, :qualification, :working_hours, :created_at, :updated_at)
                        ON CONFLICT (user_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            professional_title = EXCLUDED.professional_title,
                            gender = EXCLUDED.gender,
                            profile_pic_url = EXCLUDED.profile_pic_url,
                            license_number = EXCLUDED.license_number,
                            medical_council_board = EXCLUDED.medical_council_board,
                            years_of_experience = EXCLUDED.years_of_experience,
                            specialization = EXCLUDED.specialization,
                            qualification = EXCLUDED.qualification,
                            working_hours = EXCLUDED.working_hours,
                            updated_at = EXCLUDED.updated_at
                    """),
                    db_update
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL update doctor profile error: {e}")

    return DoctorProfileResponse.model_validate(p_data)
