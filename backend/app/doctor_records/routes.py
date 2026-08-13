import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import local_engine, supabase
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/doctor-records", tags=["Doctor Records"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PrescriptionIn(BaseModel):
    elder_id: str
    patient: Optional[str] = None
    mrn: Optional[str] = None
    medicine: str
    sig: Optional[str] = None
    duration: Optional[str] = None
    refills: Optional[int] = 0
    pharmacy: Optional[str] = None
    status: Optional[str] = "Active (e-Signed)"
    time_slot: Optional[str] = None
    meal_timing: Optional[str] = None
    rx_type: Optional[str] = "text"
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[str] = None
    instructions: Optional[str] = None


class ReportValue(BaseModel):
    name: str
    result: Optional[str] = None
    ref: Optional[str] = None
    status: Optional[str] = None


class ReportIn(BaseModel):
    elder_id: str
    patient: Optional[str] = None
    mrn: Optional[str] = None
    title: str
    source: Optional[str] = None
    status: Optional[str] = "Verified Normal"
    tier: Optional[str] = "normal"
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[str] = None
    values: Optional[List[ReportValue]] = None


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [])


def _json_loads(value: Any) -> Any:
    if isinstance(value, (list, dict)):
        return value
    if not value:
        return []
    try:
        return json.loads(value)
    except Exception:
        return []


def ensure_local_schema() -> None:
    if local_engine is None:
        return
    with local_engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS doctor_prescriptions (
                id TEXT PRIMARY KEY,
                doctor_id TEXT NOT NULL,
                elder_id TEXT NOT NULL,
                patient TEXT,
                mrn TEXT,
                medicine TEXT NOT NULL,
                sig TEXT,
                duration TEXT,
                refills INTEGER,
                pharmacy TEXT,
                status TEXT,
                time_slot TEXT,
                meal_timing TEXT,
                rx_type TEXT,
                file_name TEXT,
                file_url TEXT,
                file_size TEXT,
                instructions TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS doctor_reports (
                id TEXT PRIMARY KEY,
                doctor_id TEXT NOT NULL,
                elder_id TEXT NOT NULL,
                patient TEXT,
                mrn TEXT,
                title TEXT NOT NULL,
                source TEXT,
                status TEXT,
                tier TEXT,
                file_name TEXT,
                file_url TEXT,
                file_size TEXT,
                values_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_doctor_prescriptions_doctor ON doctor_prescriptions(doctor_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_doctor_prescriptions_elder ON doctor_prescriptions(elder_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_doctor_reports_doctor ON doctor_reports(doctor_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_doctor_reports_elder ON doctor_reports(elder_id)"))


def _is_linked_caregiver(caregiver_id: str, elder_id: str) -> bool:
    if local_engine is not None:
        with local_engine.connect() as conn:
            row = conn.execute(
                text("""
                    SELECT 1 FROM elder_caregiver_links
                    WHERE caregiver_id = :caregiver_id
                      AND elder_id = :elder_id
                      AND COALESCE(status, 'active') = 'active'
                    LIMIT 1
                """),
                {"caregiver_id": caregiver_id, "elder_id": elder_id},
            ).fetchone()
            if row:
                return True
    if supabase is not None:
        try:
            result = (
                supabase.table("elder_caregiver_links")
                .select("elder_id")
                .eq("caregiver_id", caregiver_id)
                .eq("elder_id", elder_id)
                .execute()
            )
            return bool(result.data)
        except Exception:
            return False
    return False


def _pharmacy_names(pharmacy_user_id: str) -> List[str]:
    names: List[str] = []
    if local_engine is not None:
        with local_engine.connect() as conn:
            row = conn.execute(
                text("SELECT pharmacy_name FROM pharmacy_profiles WHERE user_id = :user_id LIMIT 1"),
                {"user_id": pharmacy_user_id},
            ).fetchone()
            if row and row[0]:
                names.append(str(row[0]).strip().lower())
    if supabase is not None:
        try:
            result = supabase.table("pharmacy_profiles").select("pharmacy_name").eq("user_id", pharmacy_user_id).execute()
            for row in result.data or []:
                if row.get("pharmacy_name"):
                    names.append(str(row["pharmacy_name"]).strip().lower())
        except Exception:
            pass
    return sorted(set(name for name in names if name))


def _authorize_elder_scope(current_user: dict, elder_id: str) -> None:
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    if role == "doctor":
        return
    if role == "elder" and user_id == elder_id:
        return
    if role == "caregiver" and _is_linked_caregiver(user_id, elder_id):
        return
    raise HTTPException(status_code=403, detail="Not authorized to access this elder's clinical records.")


def _list_local(table: str, current_user: dict, elder_id: Optional[str]) -> List[Dict[str, Any]]:
    if local_engine is None:
        return []
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    params: Dict[str, Any] = {}
    clauses: List[str] = []
    if role == "doctor":
        clauses.append("doctor_id = :user_id")
        params["user_id"] = user_id
        if elder_id:
            clauses.append("elder_id = :elder_id")
            params["elder_id"] = elder_id
    elif role == "elder":
        clauses.append("elder_id = :user_id")
        params["user_id"] = user_id
    elif role == "caregiver":
        if not elder_id:
            return []
        _authorize_elder_scope(current_user, elder_id)
        clauses.append("elder_id = :elder_id")
        params["elder_id"] = elder_id
    elif role == "pharmacy":
        if table != "doctor_prescriptions":
            return []
        names = _pharmacy_names(user_id)
        if not names:
            return []
        name_clauses = []
        for index, name in enumerate(names):
            key = f"pharmacy_name_{index}"
            name_clauses.append(f"LOWER(COALESCE(pharmacy, '')) = :{key}")
            params[key] = name
        clauses.append(f"({' OR '.join(name_clauses)})")
    else:
        raise HTTPException(status_code=403, detail="Role cannot access clinical records.")

    with local_engine.connect() as conn:
        rows = conn.execute(
            text(f"SELECT * FROM {table} WHERE {' AND '.join(clauses)} ORDER BY created_at DESC"),
            params,
        ).fetchall()
        return [dict(row._mapping) for row in rows]


def _insert_local(table: str, data: Dict[str, Any]) -> None:
    if local_engine is None:
        return
    columns = list(data.keys())
    with local_engine.begin() as conn:
        conn.execute(
            text(f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(f':{c}' for c in columns)})"),
            data,
        )


def _delete_local(table: str, record_id: str, doctor_id: str) -> int:
    if local_engine is None:
        return 0
    with local_engine.begin() as conn:
        result = conn.execute(
            text(f"DELETE FROM {table} WHERE id = :id AND doctor_id = :doctor_id"),
            {"id": record_id, "doctor_id": doctor_id},
        )
        return int(result.rowcount or 0)


def _list_supabase(table: str, current_user: dict, elder_id: Optional[str]) -> List[Dict[str, Any]]:
    if supabase is None:
        return []
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    try:
        query = supabase.table(table).select("*")
        if role == "doctor":
            query = query.eq("doctor_id", user_id)
            if elder_id:
                query = query.eq("elder_id", elder_id)
        elif role == "elder":
            query = query.eq("elder_id", user_id)
        elif role == "caregiver":
            if not elder_id:
                return []
            _authorize_elder_scope(current_user, elder_id)
            query = query.eq("elder_id", elder_id)
        elif role == "pharmacy":
            if table != "doctor_prescriptions":
                return []
            names = _pharmacy_names(user_id)
            if not names:
                return []
            query = query.in_("pharmacy", names)
        else:
            raise HTTPException(status_code=403, detail="Role cannot access clinical records.")
        result = query.order("created_at", desc=True).execute()
        return cast(List[Dict[str, Any]], result.data or [])
    except HTTPException:
        raise
    except Exception:
        return []


def _insert_supabase(table: str, data: Dict[str, Any]) -> None:
    if supabase is None:
        return
    try:
        supabase.table(table).insert(data).execute()
    except Exception:
        pass


def _delete_supabase(table: str, record_id: str, doctor_id: str) -> None:
    if supabase is None:
        return
    try:
        supabase.table(table).delete().eq("id", record_id).eq("doctor_id", doctor_id).execute()
    except Exception:
        pass


def _format_prescription(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        **row,
        "elderId": row.get("elder_id"),
        "timeSlot": row.get("time_slot"),
        "mealTiming": row.get("meal_timing"),
        "rxType": row.get("rx_type"),
        "fileName": row.get("file_name"),
        "fileUrl": row.get("file_url"),
        "fileSize": row.get("file_size"),
        "date": row.get("created_at", "")[:10],
    }


def _format_report(row: Dict[str, Any]) -> Dict[str, Any]:
    values = row.get("values")
    if values is None:
        values = _json_loads(row.get("values_json"))
    return {
        **row,
        "elderId": row.get("elder_id"),
        "fileName": row.get("file_name"),
        "fileUrl": row.get("file_url"),
        "fileSize": row.get("file_size"),
        "values": values,
        "date": row.get("created_at", "")[:10],
    }


@router.get("/prescriptions")
def list_prescriptions(
    elder_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    ensure_local_schema()
    records = _list_local("doctor_prescriptions", current_user, elder_id)
    if not records:
        records = _list_supabase("doctor_prescriptions", current_user, elder_id)
    return [_format_prescription(record) for record in records]


@router.post("/prescriptions", status_code=status.HTTP_201_CREATED)
def create_prescription(
    payload: PrescriptionIn,
    current_user: dict = Depends(require_role(["doctor"])),
):
    ensure_local_schema()
    timestamp = now_iso()
    data = {
        "id": str(uuid.uuid4()),
        "doctor_id": current_user["user_id"],
        "elder_id": payload.elder_id,
        "patient": payload.patient,
        "mrn": payload.mrn,
        "medicine": payload.medicine,
        "sig": payload.sig,
        "duration": payload.duration,
        "refills": payload.refills,
        "pharmacy": payload.pharmacy,
        "status": payload.status,
        "time_slot": payload.time_slot,
        "meal_timing": payload.meal_timing,
        "rx_type": payload.rx_type,
        "file_name": payload.file_name,
        "file_url": payload.file_url,
        "file_size": payload.file_size,
        "instructions": payload.instructions,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    _insert_local("doctor_prescriptions", data)
    _insert_supabase("doctor_prescriptions", data)
    return _format_prescription(data)


@router.delete("/prescriptions/{record_id}")
def delete_prescription(
    record_id: str,
    current_user: dict = Depends(require_role(["doctor"])),
):
    ensure_local_schema()
    deleted = _delete_local("doctor_prescriptions", record_id, current_user["user_id"])
    _delete_supabase("doctor_prescriptions", record_id, current_user["user_id"])
    if deleted == 0 and supabase is None:
        raise HTTPException(status_code=404, detail="Prescription not found.")
    return {"status": "success", "id": record_id}


@router.get("/reports")
def list_reports(
    elder_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    ensure_local_schema()
    records = _list_local("doctor_reports", current_user, elder_id)
    if not records:
        records = _list_supabase("doctor_reports", current_user, elder_id)
    return [_format_report(record) for record in records]


@router.post("/reports", status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportIn,
    current_user: dict = Depends(require_role(["doctor"])),
):
    ensure_local_schema()
    timestamp = now_iso()
    data = {
        "id": str(uuid.uuid4()),
        "doctor_id": current_user["user_id"],
        "elder_id": payload.elder_id,
        "patient": payload.patient,
        "mrn": payload.mrn,
        "title": payload.title,
        "source": payload.source,
        "status": payload.status,
        "tier": payload.tier,
        "file_name": payload.file_name,
        "file_url": payload.file_url,
        "file_size": payload.file_size,
        "values_json": _json_dumps([value.model_dump() for value in payload.values] if payload.values else []),
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    _insert_local("doctor_reports", data)
    _insert_supabase("doctor_reports", data)
    return _format_report(data)


@router.delete("/reports/{record_id}")
def delete_report(
    record_id: str,
    current_user: dict = Depends(require_role(["doctor"])),
):
    ensure_local_schema()
    deleted = _delete_local("doctor_reports", record_id, current_user["user_id"])
    _delete_supabase("doctor_reports", record_id, current_user["user_id"])
    if deleted == 0 and supabase is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return {"status": "success", "id": record_id}
