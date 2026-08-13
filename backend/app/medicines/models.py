from enum import Enum


class SessionStatus(str, Enum):
    PENDING = "PENDING"
    RINGING = "RINGING"
    RETRY_WAIT = "RETRY_WAIT"
    RESOLVED = "RESOLVED"
    AUTO_MISSED = "AUTO_MISSED"


class SessionResolution(str, Enum):
    TAKEN = "taken"
    DISMISSED = "dismissed"
    AUTO_MISSED = "auto_missed"
