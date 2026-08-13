import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import text
from app.core.security import get_current_user
from app.core.database import supabase, local_engine

logger = logging.getLogger("elderguard.profiles.links")

router = APIRouter(prefix="/profiles/links", tags=["Profile Links"])


class ElderCaregiverLinkRequest(BaseModel):
    elder_id: str
    caregiver_id: str


class ConnectWithElderRequest(BaseModel):
    elder_id: str


class DoctorHospitalLinkRequest(BaseModel):
    doctor_id: str
    hospital_id: str


class HospitalCareUnitRequest(BaseModel):
    hospital_id: str
    unit_name: str


@router.post("/elder-caregiver", status_code=status.HTTP_201_CREATED)
def link_elder_caregiver(
    payload: ElderCaregiverLinkRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Link an Elder profile to a Caregiver profile in active database.
    """
    link_data = {"elder_id": payload.elder_id, "caregiver_id": payload.caregiver_id}
    if supabase is not None:
        try:
            supabase.table("elder_caregiver_links").insert(link_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase link_elder_caregiver error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("INSERT INTO elder_caregiver_links (elder_id, caregiver_id) VALUES (:elder_id, :caregiver_id)"),
                    link_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL link_elder_caregiver error: {e}")

    return {"status": "success", "message": "Elder and Caregiver linked successfully.", "link": link_data}


@router.post("/connect-elder", status_code=status.HTTP_201_CREATED)
def connect_with_elder(
    payload: ConnectWithElderRequest,
    current_user: dict = Depends(get_current_user),
):
    """Connect the authenticated caregiver to an elder using the shareable Elder ID."""
    if current_user.get("role") != "caregiver":
        raise HTTPException(status_code=403, detail="Only caregivers can connect to an Elder ID.")

    public_elder_id = payload.elder_id.strip().upper()
    elder = None
    if supabase is not None:
        try:
            result = supabase.table("elder_profiles").select("*").eq("elder_id", public_elder_id).execute()
            if result.data:
                elder = result.data[0]
        except Exception as exc:
            logger.warning("Cloud Supabase Elder ID lookup error: %s", exc)

    if elder is None and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                row = conn.execute(
                    text("SELECT * FROM elder_profiles WHERE elder_id = :elder_id LIMIT 1"),
                    {"elder_id": public_elder_id},
                ).fetchone()
                if row:
                    elder = dict(row._mapping)
        except Exception as exc:
            logger.warning("Local Elder ID lookup error: %s", exc)

    if elder is None:
        raise HTTPException(status_code=404, detail="No elder was found with that Elder ID.")

    link_data = {"elder_id": str(elder["user_id"]), "caregiver_id": current_user["user_id"]}
    if supabase is not None:
        try:
            existing = supabase.table("elder_caregiver_links").select("elder_id").match(link_data).execute()
            if not existing.data:
                supabase.table("elder_caregiver_links").insert(link_data).execute()
        except Exception as exc:
            logger.warning("Cloud caregiver connection error: %s", exc)

    if local_engine is not None:
        try:
            with local_engine.begin() as conn:
                existing = conn.execute(
                    text("SELECT 1 FROM elder_caregiver_links WHERE elder_id = :elder_id AND caregiver_id = :caregiver_id"),
                    link_data,
                ).fetchone()
                if not existing:
                    now = datetime.now(timezone.utc).isoformat()
                    conn.execute(
                        text("""
                            INSERT INTO elder_caregiver_links
                            (id, elder_id, caregiver_id, permission_level, status, invited_by, invited_at, accepted_at, created_at, updated_at)
                            VALUES (:id, :elder_id, :caregiver_id, 'full_access', 'active', :caregiver_id, :now, :now, :now, :now)
                        """),
                        {**link_data, "id": str(uuid.uuid4()), "now": now},
                    )
        except Exception as exc:
            logger.error("Local caregiver connection error: %s", exc)
            raise HTTPException(status_code=500, detail="Unable to save the caregiver connection.")

    return {
        "status": "success",
        "message": "Elder connected successfully.",
        "elder": {"user_id": elder["user_id"], "elder_id": elder["elder_id"], "name": elder.get("name")},
    }


@router.get("/elders/{caregiver_id}")
def get_linked_elders(caregiver_id: str, current_user: dict = Depends(get_current_user)):
    """Return elders connected to the authenticated caregiver."""
    if current_user["user_id"] != caregiver_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these connections.")

    if local_engine is not None:
        with local_engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT e.user_id, e.elder_id, e.name, e.age_or_dob, e.profile_pic_url
                FROM elder_caregiver_links l
                JOIN elder_profiles e ON e.user_id = l.elder_id
                WHERE l.caregiver_id = :caregiver_id
                ORDER BY e.name
            """), {"caregiver_id": caregiver_id}).fetchall()
            return [dict(row._mapping) for row in rows]
    return []


@router.post("/doctor-hospital", status_code=status.HTTP_201_CREATED)
def link_doctor_hospital(
    payload: DoctorHospitalLinkRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Link a Doctor profile to a Hospital profile in active database.
    """
    link_data = {"doctor_id": payload.doctor_id, "hospital_id": payload.hospital_id}
    if supabase is not None:
        try:
            supabase.table("doctor_hospital_links").insert(link_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase link_doctor_hospital error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("INSERT INTO doctor_hospital_links (doctor_id, hospital_id) VALUES (:doctor_id, :hospital_id)"),
                    link_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL link_doctor_hospital error: {e}")

    return {"status": "success", "message": "Doctor and Hospital linked successfully.", "link": link_data}


@router.post("/hospital-unit", status_code=status.HTTP_201_CREATED)
def add_hospital_care_unit(
    payload: HospitalCareUnitRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a care unit to a Hospital profile in active database.
    """
    unit_data = {"hospital_id": payload.hospital_id, "unit_name": payload.unit_name}
    if supabase is not None:
        try:
            supabase.table("hospital_care_units").insert(unit_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase add_hospital_care_unit error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("INSERT INTO hospital_care_units (hospital_id, unit_name) VALUES (:hospital_id, :unit_name)"),
                    unit_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL add_hospital_care_unit error: {e}")

    return {"status": "success", "message": "Hospital care unit added successfully.", "unit": unit_data}
