import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import local_engine, supabase
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/hospital", tags=["Hospital Operations"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DepartmentIn(BaseModel):
    name: str
    head: Optional[str] = None
    beds_total: Optional[int] = None
    beds_occupied: Optional[int] = None
    status: Optional[str] = None
    contact_ext: Optional[str] = None


class PatientIn(BaseModel):
    name: str
    elder_id: Optional[str] = None
    assigned_doctor_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class QueueIn(BaseModel):
    patient_name: str
    appointment_id: Optional[str] = None
    department_id: Optional[str] = None
    queue_token: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    reason: Optional[str] = None


class BillingIn(BaseModel):
    patient_name: str
    patient_id: Optional[str] = None
    invoice_no: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    description: Optional[str] = None


TABLES = {
    "departments": "hospital_departments",
    "patients": "hospital_patients",
    "queue": "hospital_queue_entries",
    "billing": "hospital_billing_records",
}


def ensure_local_schema() -> None:
    if local_engine is None:
        return

    with local_engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS hospital_departments (
                id TEXT PRIMARY KEY,
                hospital_id TEXT NOT NULL,
                name TEXT NOT NULL,
                head TEXT,
                beds_total INTEGER,
                beds_occupied INTEGER,
                status TEXT,
                contact_ext TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS hospital_patients (
                id TEXT PRIMARY KEY,
                hospital_id TEXT NOT NULL,
                elder_id TEXT,
                name TEXT NOT NULL,
                assigned_doctor_id TEXT,
                status TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS hospital_queue_entries (
                id TEXT PRIMARY KEY,
                hospital_id TEXT NOT NULL,
                appointment_id TEXT,
                patient_name TEXT NOT NULL,
                department_id TEXT,
                queue_token TEXT,
                status TEXT,
                priority TEXT,
                reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS hospital_billing_records (
                id TEXT PRIMARY KEY,
                hospital_id TEXT NOT NULL,
                patient_id TEXT,
                patient_name TEXT NOT NULL,
                invoice_no TEXT,
                amount REAL,
                status TEXT,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """))


def require_hospital(current_user: dict = Depends(require_role(["hospital"]))) -> dict:
    ensure_local_schema()
    return current_user


def _list_local(table: str, hospital_id: str) -> List[Dict[str, Any]]:
    if local_engine is None:
        return []
    with local_engine.connect() as conn:
        rows = conn.execute(
            text(f"SELECT * FROM {table} WHERE hospital_id = :hospital_id ORDER BY created_at DESC"),
            {"hospital_id": hospital_id},
        ).fetchall()
        return [dict(row._mapping) for row in rows]


def _insert_local(table: str, data: Dict[str, Any]) -> None:
    if local_engine is None:
        return
    columns = list(data.keys())
    column_sql = ", ".join(columns)
    value_sql = ", ".join([f":{column}" for column in columns])
    with local_engine.begin() as conn:
        conn.execute(text(f"INSERT INTO {table} ({column_sql}) VALUES ({value_sql})"), data)


def _list_supabase(table: str, hospital_id: str) -> List[Dict[str, Any]]:
    if supabase is None:
        return []
    try:
        result = supabase.table(table).select("*").eq("hospital_id", hospital_id).order("created_at", desc=True).execute()
        return cast(List[Dict[str, Any]], result.data or [])
    except Exception:
        return []


def _insert_supabase(table: str, data: Dict[str, Any]) -> None:
    if supabase is None:
        return
    try:
        supabase.table(table).insert(data).execute()
    except Exception:
        pass


def list_records(kind: str, hospital_id: str) -> List[Dict[str, Any]]:
    table = TABLES[kind]
    records = _list_local(table, hospital_id)
    if records:
        return records
    return _list_supabase(table, hospital_id)


def insert_record(kind: str, data: Dict[str, Any]) -> Dict[str, Any]:
    table = TABLES[kind]
    _insert_local(table, data)
    _insert_supabase(table, data)
    return data


@router.get("/overview")
def overview(current_user: dict = Depends(require_hospital)):
    hospital_id = current_user["user_id"]
    departments = list_records("departments", hospital_id)
    patients = list_records("patients", hospital_id)
    queue = list_records("queue", hospital_id)
    billing = list_records("billing", hospital_id)

    doctors_count = 0
    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                doctors_count = conn.execute(text("SELECT COUNT(*) FROM users WHERE role = 'doctor'")).scalar() or 0
        except Exception:
            doctors_count = 0

    return {
        "departments_count": len(departments),
        "patients_count": len(patients),
        "queue_count": len(queue),
        "billing_count": len(billing),
        "doctors_count": doctors_count,
    }


@router.get("/departments")
def list_departments(current_user: dict = Depends(require_hospital)):
    return list_records("departments", current_user["user_id"])


@router.post("/departments", status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentIn, current_user: dict = Depends(require_hospital)):
    timestamp = now_iso()
    data = {
        "id": str(uuid.uuid4()),
        "hospital_id": current_user["user_id"],
        "name": payload.name,
        "head": payload.head,
        "beds_total": payload.beds_total,
        "beds_occupied": payload.beds_occupied,
        "status": payload.status,
        "contact_ext": payload.contact_ext,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    return insert_record("departments", data)


@router.get("/patients")
def list_patients(current_user: dict = Depends(require_hospital)):
    return list_records("patients", current_user["user_id"])


@router.post("/patients", status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientIn, current_user: dict = Depends(require_hospital)):
    timestamp = now_iso()
    data = {
        "id": str(uuid.uuid4()),
        "hospital_id": current_user["user_id"],
        "elder_id": payload.elder_id,
        "name": payload.name,
        "assigned_doctor_id": payload.assigned_doctor_id,
        "status": payload.status,
        "notes": payload.notes,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    return insert_record("patients", data)


@router.get("/queue")
def list_queue(current_user: dict = Depends(require_hospital)):
    return list_records("queue", current_user["user_id"])


@router.post("/queue", status_code=status.HTTP_201_CREATED)
def create_queue_entry(payload: QueueIn, current_user: dict = Depends(require_hospital)):
    timestamp = now_iso()
    data = {
        "id": str(uuid.uuid4()),
        "hospital_id": current_user["user_id"],
        "appointment_id": payload.appointment_id,
        "patient_name": payload.patient_name,
        "department_id": payload.department_id,
        "queue_token": payload.queue_token,
        "status": payload.status,
        "priority": payload.priority,
        "reason": payload.reason,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    return insert_record("queue", data)


@router.get("/billing")
def list_billing(current_user: dict = Depends(require_hospital)):
    return list_records("billing", current_user["user_id"])


@router.post("/billing", status_code=status.HTTP_201_CREATED)
def create_billing_record(payload: BillingIn, current_user: dict = Depends(require_hospital)):
    timestamp = now_iso()
    data = {
        "id": str(uuid.uuid4()),
        "hospital_id": current_user["user_id"],
        "patient_id": payload.patient_id,
        "patient_name": payload.patient_name,
        "invoice_no": payload.invoice_no,
        "amount": payload.amount,
        "status": payload.status,
        "description": payload.description,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    return insert_record("billing", data)
