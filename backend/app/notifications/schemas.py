from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.notifications.models import NotificationType, NotificationPriority, DeviceType


class DeviceTokenRegister(BaseModel):
    fcm_token: str = Field(..., min_length=1)
    device_type: DeviceType = DeviceType.ANDROID


class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    type: NotificationType
    title: str
    body: str
    payload: Optional[Dict[str, Any]] = None
    priority: NotificationPriority
    is_read: bool = False
    delivered_via: List[str] = []
    created_at: str


class NotificationHistoryResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    page: int
    limit: int


class UnreadCountResponse(BaseModel):
    count: int


class TelegramLinkUrlResponse(BaseModel):
    url: str


class BroadcastNotificationRequest(BaseModel):
    recipient_ids: List[str] = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    type: str = "alert"
    priority: str = "CRITICAL"
    payload: Optional[Dict[str, Any]] = None

