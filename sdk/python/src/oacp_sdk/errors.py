"""Client error types."""

from enum import Enum


class ClientErrorCode(str, Enum):
    SERVER_ERROR = 'SERVER_ERROR'
    VALIDATION_FAILED = 'VALIDATION_FAILED'
    AGENT_NOT_FOUND = 'AGENT_NOT_FOUND'
    ROUTING_FAILED = 'ROUTING_FAILED'
    RESPONSE_TIMEOUT = 'RESPONSE_TIMEOUT'
    INVALID_RESPONSE = 'INVALID_RESPONSE'
    TRANSPORT_ERROR = 'TRANSPORT_ERROR'


class ClientError(Exception):
    """Raised when an OACP HTTP client operation fails."""

    def __init__(
        self,
        code: ClientErrorCode,
        message: str,
        *,
        status_code: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
