from enum import Enum


class SOSStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class SOSRecipientType(str, Enum):
    CAREGIVER = "caregiver"
    SECONDARY_CAREGIVER = "secondary_caregiver"
    HOSPITAL = "hospital"
    EMERGENCY_SERVICES = "emergency_services"


class SOSLogAction(str, Enum):
    TRIGGERED = "triggered"
    TIER_1_NOTIFIED = "tier_1_notified"
    TIER_2_ESCALATED = "tier_2_escalated"
    TIER_3_ESCALATED = "tier_3_escalated"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    BROADCAST_FAILED = "broadcast_failed"
