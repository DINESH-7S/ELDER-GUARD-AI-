from enum import Enum
from typing import Dict, Set


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"
    NO_SHOW = "no_show"


class ConsultationMode(str, Enum):
    IN_PERSON = "in_person"
    TELEMEDICINE = "telemedicine"


class AvailabilityMode(str, Enum):
    IN_PERSON = "in_person"
    TELEMEDICINE = "telemedicine"
    BOTH = "both"


class CancelledBy(str, Enum):
    ELDER = "elder"
    CAREGIVER = "caregiver"
    DOCTOR = "doctor"
    HOSPITAL = "hospital"
    SYSTEM = "system"


class TelemedStatus(str, Enum):
    CREATED = "created"
    ACTIVE = "active"
    ENDED = "ended"
    EXPIRED = "expired"


# Strict state machine transition matrix
STATUS_TRANSITIONS: Dict[AppointmentStatus, Set[AppointmentStatus]] = {
    AppointmentStatus.SCHEDULED: {
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.CONFIRMED: {
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.IN_CONSULTATION,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.CHECKED_IN: {
        AppointmentStatus.IN_CONSULTATION,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.IN_CONSULTATION: {
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
    },
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.CANCELLED: set(),
    AppointmentStatus.RESCHEDULED: set(),
    AppointmentStatus.NO_SHOW: set(),
}
