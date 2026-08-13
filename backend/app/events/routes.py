import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy import text

from app.core.security import get_current_user
from app.core.database import supabase, local_engine
from app.events.models import (
    EventCategory,
    CommunityEventCreate,
    CommunityEventOut,
    EventRegistrationOut,
)

logger = logging.getLogger("elderguard.events.routes")

router = APIRouter(prefix="/events", tags=["Community Events Service"])

# In-memory mock storage for community events fallback & testing
_mock_events_db: List[Dict[str, Any]] = [
    {
        "id": "evt-flower-arrangements",
        "title": "Virtual Class: Flower Arrangements",
        "description": "Join this interactive virtual workshop hosted by AARP to master the art of floral design, flower care, and creative DIY bouquet styling from home.",
        "category": "workshop",
        "event_date": "2026-10-24T10:00:00Z",
        "location": "Online / Virtual (AARP Platform)",
        "organizer": "AARP Virtual Community Events",
        "registration_link": "https://www.aarp.org/events/details.virtual-class-flower-arrangements.b5nhqvrpp8y/?intcmp=EVENTS-HUB-BTN-CLK-CAROUSEL-.virtual-class-flower-arrangements",
        "image_url": "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80",
        "is_featured": True,
        "created_at": "2026-08-10T12:00:00Z",
    },
    {
        "id": "evt-jodhpur-jaisalmer",
        "title": "Jodhpur & Jaisalmer New Year Trip Package",
        "description": "A specially curated, senior-friendly travel package departing from Vadodara to Rajasthan. Experience desert safari camping, historic fort tours, folk music, and New Year celebrations.",
        "category": "social",
        "event_date": "2026-12-29T06:00:00Z",
        "location": "Vadodara, Gujarat -> Rajasthan",
        "organizer": "Gujarat Cultural Expeditions",
        "registration_link": "https://www.eventbrite.com/e/jodhpur-jaisalmer-new-year-trip-package-from-vadodara-gujrat-2026-2027-tickets-1990930710349",
        "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80",
        "is_featured": True,
        "created_at": "2026-08-10T12:00:00Z",
    },
    {
        "id": "evt-singapore-bali",
        "title": "Singapore to Bali: An Indonesian Island Expedition",
        "description": "Embark on an inspiring educational & wellness expedition through the Indonesian islands. Explore vibrant coral reefs, ancient temples, traditional music, and serene island retreats.",
        "category": "health_camp",
        "event_date": "2026-11-12T09:00:00Z",
        "location": "Singapore -> Indonesian Archipelago -> Bali",
        "organizer": "Road Scholar Educational Travel",
        "registration_link": "https://www.roadscholar.org/find-an-adventure/25671/Singapore-to-Bali-An-Indonesian-Island-Expedition",
        "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
        "is_featured": True,
        "created_at": "2026-08-10T12:00:00Z",
    }
]
_mock_event_registrations_db: List[Dict[str, Any]] = []


@router.get("/list", response_model=List[CommunityEventOut])
def get_community_events(
    category: Optional[EventCategory] = Query(None),
    is_featured: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists upcoming community social and wellness events for elders from active database.
    """
    category_val = None
    if isinstance(category, EventCategory):
        category_val = category.value
    elif isinstance(category, str):
        category_val = category

    featured_val = is_featured if isinstance(is_featured, bool) else None
    search_val = search if isinstance(search, str) else None

    results: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            q = supabase.table("community_events").select("*")
            if category_val:
                q = q.eq("category", category_val)
            if featured_val is not None:
                q = q.eq("is_featured", featured_val)
            res = q.order("event_date", desc=False).execute()
            if res.data:
                results = [dict(item) for item in res.data if isinstance(item, dict)]
        except Exception as e:
            logger.warning(f"Cloud Supabase events list error: {e}")

    if not results and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                sql = "SELECT * FROM community_events WHERE 1=1"
                params = {}
                if category_val:
                    sql += " AND category = :cat"
                    params["cat"] = category_val
                if featured_val is not None:
                    sql += " AND is_featured = :feat"
                    params["feat"] = featured_val
                sql += " ORDER BY event_date ASC"
                res = conn.execute(text(sql), params)
                results = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL events list error: {e}")

    if not results:
        results = [
            e for e in _mock_events_db
            if (not category_val or e.get("category") == category_val) and (featured_val is None or e.get("is_featured") == featured_val)
        ]

    if search_val:
        s_lower = search_val.lower()
        results = [
            e for e in results
            if s_lower in e.get("title", "").lower() or s_lower in e.get("description", "").lower() or s_lower in e.get("location", "").lower()
        ]

    return [CommunityEventOut(**e) for e in results]


@router.get("/{id}", response_model=CommunityEventOut)
def get_event_by_id(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves specific community event details."""
    event: Optional[Dict[str, Any]] = None
    if supabase is not None:
        try:
            res = supabase.table("community_events").select("*").eq("id", id).execute()
            if res.data and isinstance(res.data[0], dict):
                event = dict(res.data[0])
        except Exception as e:
            logger.warning(f"Cloud Supabase event lookup error: {e}")

    if not event and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM community_events WHERE id = :id LIMIT 1"), {"id": id})
                row = res.fetchone()
                if row:
                    event = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL event lookup error: {e}")

    if not event:
        for e in _mock_events_db:
            if e.get("id") == id:
                event = e
                break

    if not event:
        raise HTTPException(status_code=404, detail=f"Community event '{id}' not found.")

    return CommunityEventOut(**event)


@router.post("/create", response_model=CommunityEventOut, status_code=status.HTTP_201_CREATED)
def create_community_event(
    payload: CommunityEventCreate,
    current_user: dict = Depends(get_current_user)
):
    """Creates a new community event for elders."""
    event_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    event_date_iso = payload.event_date.isoformat()

    event_data = {
        "id": event_id,
        "title": payload.title,
        "description": payload.description,
        "category": payload.category.value,
        "event_date": event_date_iso,
        "location": payload.location,
        "organizer": payload.organizer,
        "registration_link": payload.registration_link,
        "image_url": payload.image_url,
        "is_featured": payload.is_featured,
        "created_at": now_iso,
    }

    _mock_events_db.append(event_data)

    if supabase is not None:
        try:
            supabase.table("community_events").insert(event_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase create event error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("""
                        INSERT INTO community_events (id, title, description, category, event_date, location, organizer, registration_link, image_url, is_featured, created_at)
                        VALUES (:id, :title, :description, :category, :event_date, :location, :organizer, :registration_link, :image_url, :is_featured, :created_at)
                    """),
                    event_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL create event error: {e}")

    return CommunityEventOut(**event_data)


@router.post("/{id}/register", response_model=EventRegistrationOut, status_code=status.HTTP_201_CREATED)
def register_for_event(
    id: str,
    elder_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Registers an elder for a community event (idempotent)."""
    target_elder_id = str(elder_id or current_user.get("user_id") or "")
    event = get_event_by_id(id, current_user)

    existing_reg: Optional[Dict[str, Any]] = None
    if supabase is not None:
        try:
            res = supabase.table("event_registrations").select("*").eq("event_id", id).eq("elder_id", target_elder_id).execute()
            if res.data and isinstance(res.data[0], dict):
                existing_reg = dict(res.data[0])
        except Exception as e:
            logger.warning(f"Cloud Supabase check existing event registration error: {e}")

    if not existing_reg and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(
                    text("SELECT * FROM event_registrations WHERE event_id = :event_id AND elder_id = :elder_id LIMIT 1"),
                    {"event_id": id, "elder_id": target_elder_id}
                )
                row = res.fetchone()
                if row:
                    existing_reg = dict(row._mapping)
        except Exception as e:
            logger.warning(f"Local PostgreSQL check existing event registration error: {e}")

    if not existing_reg:
        for r in _mock_event_registrations_db:
            if r.get("event_id") == id and r.get("elder_id") == target_elder_id:
                existing_reg = r
                break

    if existing_reg:
        return EventRegistrationOut(
            id=existing_reg["id"],
            event_id=id,
            elder_id=target_elder_id,
            event_title=event.title,
            registration_link=event.registration_link,
            registered_at=str(existing_reg["registered_at"])
        )

    reg_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    reg_data = {
        "id": reg_id,
        "event_id": id,
        "elder_id": target_elder_id,
        "registered_at": now_iso,
    }

    _mock_event_registrations_db.append(reg_data)

    if supabase is not None:
        try:
            supabase.table("event_registrations").insert(reg_data).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase event registration error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(
                    text("INSERT INTO event_registrations (id, event_id, elder_id, registered_at) VALUES (:id, :event_id, :elder_id, :registered_at)"),
                    reg_data
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL event registration error: {e}")

    return EventRegistrationOut(
        id=reg_id,
        event_id=id,
        elder_id=target_elder_id,
        event_title=event.title,
        registration_link=event.registration_link,
        registered_at=now_iso
    )


@router.get("/my-registrations/{elder_id}", response_model=List[EventRegistrationOut])
def get_elder_registered_events(
    elder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Lists all community events registered by an elder."""
    regs: List[Dict[str, Any]] = []
    if supabase is not None:
        try:
            res = supabase.table("event_registrations").select("*").eq("elder_id", elder_id).execute()
            if res.data:
                regs = [dict(item) for item in res.data if isinstance(item, dict)]
        except Exception as e:
            logger.warning(f"Cloud Supabase my-registrations error: {e}")

    if not regs and local_engine is not None:
        try:
            with local_engine.connect() as conn:
                res = conn.execute(text("SELECT * FROM event_registrations WHERE elder_id = :elder_id"), {"elder_id": elder_id})
                regs = [dict(r._mapping) for r in res.fetchall()]
        except Exception as e:
            logger.warning(f"Local PostgreSQL my-registrations error: {e}")

    if not regs:
        regs = [r for r in _mock_event_registrations_db if r.get("elder_id") == elder_id]

    out = []
    for r in regs:
        try:
            ev = get_event_by_id(r["event_id"], current_user)
            out.append(EventRegistrationOut(
                id=r["id"],
                event_id=r["event_id"],
                elder_id=elder_id,
                event_title=ev.title,
                registration_link=ev.registration_link,
                registered_at=str(r["registered_at"])
            ))
        except Exception:
            pass

    out.sort(key=lambda x: str(x.registered_at), reverse=True)
    return out


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_community_event(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Deletes a community event by ID."""
    global _mock_events_db
    _mock_events_db[:] = [e for e in _mock_events_db if e.get("id") != id]

    if supabase is not None:
        try:
            supabase.table("community_events").delete().eq("id", id).execute()
        except Exception as e:
            logger.error(f"Cloud Supabase delete event error: {e}")

    if local_engine is not None:
        try:
            with local_engine.connect() as conn:
                conn.execute(text("DELETE FROM community_events WHERE id = :id"), {"id": id})
                conn.commit()
        except Exception as e:
            logger.error(f"Local PostgreSQL delete event error: {e}")

    return {"status": "success", "message": f"Community event '{id}' deleted successfully."}
