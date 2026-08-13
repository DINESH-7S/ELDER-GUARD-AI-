from enum import Enum


class NotificationType(str, Enum):
    ALARM = "alarm"
    ALERT = "alert"
    INFO = "info"


class NotificationPriority(str, Enum):
    HIGH = "high"
    NORMAL = "normal"


class DeviceType(str, Enum):
    ANDROID = "android"
    IOS = "ios"
    WEB = "web"
