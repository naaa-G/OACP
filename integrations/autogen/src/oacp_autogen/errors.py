"""Errors raised by OACP integration adapters."""

from __future__ import annotations


class OacpTaskError(RuntimeError):
    """Raised when an OACP task returns ``status: error``."""

    def __init__(
        self,
        message: str,
        *,
        code: str = 'OACP_TASK_FAILED',
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.details = details or []
