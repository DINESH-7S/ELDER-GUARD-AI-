import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, cast
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy import text

from app.core.security import get_current_user
from app.core.database import supabase, local_engine
from app.reports.models import ReportCreate, ReportOut, ReportType

logger = logging.getLogger("elderguard.reports.routes")

router = APIRouter(prefix="/reports", tags=["Medical Reports Vault"])

# In-memory mock storage for reports fallback & testing
_mock_reports_db: List[Dict[str, Any]] = []


def verify_report_access(current_user: dict, elder_id: str, is_write: bool = False):
    user_id = current_user.get("user_id")
    role = current_user.get("role")

    if user_id == elder_id:
        return True
    if role in ["caregiver", "doctor"]:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"User '{user_id}' with role '{role}' is not authorized to access reports for elder '{elder_id}'."
    )


@router.post("/upload", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def upload_report(
    payload: ReportCreate,
    current_user: dict = Depends(get_current_user)
):
    """Uploads a new medical report record to active database."""
    verify_report_access(current_user, payload.elder_id, is_write=True)

    report_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    report_data = {
        "id": report_id,
        "elder_id": payload.elder_id,
        "uploaded_by": current_user["user_id"],
        "title": payload.title,
        "report_type": payload.report_type.value if hasattr(payload.report_type, 'value') else payload.report_type,
        "file_url": payload.file_url,
        "notes": payload.notes,
        "parsed_data": payload.parsed_data or {},
        "uploaded_at": now_iso,
        "created_at": now_iso,
    }

    _mock_reports_db.append(report_data)

    if supabase is not None:
        try:
            supabase.table("medical_reports").insert(report_data).execute()
        except Exception as e:
            logger.error(f"Error inserting report to Cloud Supabase: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO medical_reports (id, elder_id, uploaded_by, title, report_type, file_url, notes, parsed_data, uploaded_at, created_at)
                        VALUES (:id, :elder_id, :uploaded_by, :title, :report_type, :file_url, :notes, :parsed_data, :uploaded_at, :created_at)
                    """),
                    report_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error inserting report to Local PostgreSQL: {e}")

    return ReportOut(**report_data)


@router.get("/list/{elder_id}", response_model=List[ReportOut])
def get_reports_list(
    elder_id: str,
    report_type: Optional[ReportType] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Lists all medical reports for an elder from active database."""
    verify_report_access(current_user, elder_id, is_write=False)

    r_type_val = None
    if isinstance(report_type, ReportType):
        r_type_val = report_type.value
    elif isinstance(report_type, str):
        r_type_val = report_type

    results: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            q = supabase.table("medical_reports").select("*").eq("elder_id", elder_id)
            if r_type_val:
                q = q.eq("report_type", r_type_val)
            res = q.order("uploaded_at", desc=True).execute()
            if res.data:
                results = cast(List[Dict[str, Any]], res.data)
        except Exception as e:
            logger.warning(f"Cloud Supabase reports list error: {e}")

    if not results and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                sql = "SELECT * FROM medical_reports WHERE elder_id = :elder_id"
                params = {"elder_id": elder_id}
                if r_type_val:
                    sql += " AND report_type = :r_type"
                    params["r_type"] = r_type_val
                sql += " ORDER BY uploaded_at DESC"
                res = conn.execute(text(sql), params)
                results = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL reports list error: {e}")

    if not results:
        results = [r for r in _mock_reports_db if r.get("elder_id") == elder_id and (not r_type_val or r.get("report_type") == r_type_val)]

    return [ReportOut.model_validate(r) for r in results]


@router.get("/{id}", response_model=ReportOut)
def get_report_details(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves specific report record by ID."""
    report: Optional[Dict[str, Any]] = None
    if supabase is not None:
        try:
            res = supabase.table("medical_reports").select("*").eq("id", id).execute()
            if res.data:
                report = cast(Dict[str, Any], res.data[0])
        except Exception as e:
            logger.warning(f"Cloud Supabase report details error: {e}")

    if not report and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM medical_reports WHERE id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    report = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL report details error: {e}")

    if not report:
        for r in _mock_reports_db:
            if r.get("id") == id:
                report = r
                break

    if not report:
        raise HTTPException(status_code=404, detail=f"Medical report '{id}' not found.")

    verify_report_access(current_user, str(report["elder_id"]), is_write=False)
    return ReportOut.model_validate(report)


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_report(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Deletes medical report by ID."""
    global _mock_reports_db
    _mock_reports_db[:] = [r for r in _mock_reports_db if r.get("id") != id]

    if supabase is not None:
        try:
            supabase.table("medical_reports").delete().eq("id", id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase delete report error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(text("DELETE FROM medical_reports WHERE id = :id"), {"id": id})
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL delete report error: {e}")

    return {"status": "success", "message": f"Medical report '{id}' deleted successfully."}
