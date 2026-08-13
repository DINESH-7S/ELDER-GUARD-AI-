class SlotConflictError(Exception):
    """Raised when an appointment slot is double-booked or conflicts with existing bookings."""
    def __init__(self, message: str = "Requested appointment slot is no longer available."):
        self.message = message
        super().__init__(self.message)


class InvalidTransitionError(Exception):
    """Raised when an illegal status state transition is attempted."""
    def __init__(self, from_status: str, to_status: str):
        self.from_status = from_status
        self.to_status = to_status
        self.message = f"Invalid status transition from '{from_status}' to '{to_status}'."
        super().__init__(self.message)
