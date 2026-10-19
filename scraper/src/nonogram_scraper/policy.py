"""Spacing between requests."""

from __future__ import annotations

import random
import time


def backoff_seconds(attempt: int, retry_after: str | None, *, cap: float = 60.0) -> float:
    """Wait after a 429 or 5xx. ``attempt`` starts at 0."""
    if retry_after:
        try:
            return min(cap, max(0.0, float(retry_after)))
        except ValueError:
            pass
    return min(cap, 1.0 * (2**attempt))


class Interval:
    """Minimum gap between the start of one wait and the next."""

    def __init__(
        self,
        delay: float,
        jitter: float = 0.0,
        *,
        sleep=time.sleep,
        now=time.monotonic,
        rng: random.Random | None = None,
    ) -> None:
        if delay < 0 or jitter < 0:
            raise ValueError("delay and jitter must be >= 0")
        self.delay = delay
        self.jitter = jitter
        self._sleep = sleep
        self._now = now
        self._rng = rng or random.Random()
        self._next = 0.0

    def wait(self) -> None:
        extra = self._rng.uniform(0, self.jitter) if self.jitter else 0.0
        gap = self.delay + extra
        now = self._now()
        if self._next > now:
            self._sleep(self._next - now)
        self._next = self._now() + gap
