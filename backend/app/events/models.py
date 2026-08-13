from enum import Enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class EventCategory(str, Enum):
    YOGA = "yoga"
    HEALTH_CAMP = "health_camp"
    WALKING_CLUB = "walking_club"
    SOCIAL = "social"
    RELIGIOUS = "religious"
    WORKSHOP = "workshop"
    OTHER = "other"


class CommunityEventCreate(BaseModel):
    title: str = Field(..., min_length=2)
    description: str = Field(..., min_length=5)
    category: EventCategory = EventCategory.SOCIAL
    event_date: datetime
    location: str = Field(..., min_length=2)
    organizer: str = Field(..., min_length=2)
    registration_link: str = Field(..., min_length=5)
    image_url: Optional[str] = None
    is_featured: bool = False


class CommunityEventOut(BaseModel):
    id: str
    title: str
    description: str
    category: EventCategory
    event_date: str
    location: str
    organizer: str
    registration_link: str
    image_url: Optional[str] = None
    is_featured: bool
    created_at: str


class EventRegistrationOut(BaseModel):
    id: str
    event_id: str
    elder_id: str
    event_title: str
    registration_link: str
    registered_at: str
