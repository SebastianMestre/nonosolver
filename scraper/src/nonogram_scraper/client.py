"""HTTP client that checks robots.txt and backs off."""

from __future__ import annotations

import time
from urllib.robotparser import RobotFileParser

import httpx

from nonogram_scraper.policy import Interval, backoff_seconds
from nonogram_scraper.urls import ROBOTS_URL, path_allowed

USER_AGENT = "nonosolver/0.1 (black-and-white nonogram dataset; respects robots.txt)"

RETRY_STATUSES = frozenset({429, 500, 502, 503, 504})


class RobotsDenied(RuntimeError):
    pass


class FetchError(RuntimeError):
    pass


class PoliteClient:
    def __init__(
        self,
        *,
        delay: float = 1.0,
        jitter: float = 0.3,
        timeout: float = 30.0,
        retries: int = 6,
        user_agent: str = USER_AGENT,
        transport: httpx.BaseTransport | None = None,
        sleep=time.sleep,
        now=time.monotonic,
    ) -> None:
        self.user_agent = user_agent
        self.retries = retries
        self._sleep = sleep
        self._interval = Interval(delay, jitter, sleep=sleep, now=now)
        self._http = httpx.Client(
            headers={
                "User-Agent": user_agent,
                "Accept": "text/html,application/xhtml+xml",
            },
            timeout=timeout,
            follow_redirects=True,
            transport=transport,
        )
        self._robots: RobotFileParser | None = None

    def __enter__(self) -> PoliteClient:
        self.open()
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def open(self) -> None:
        text = self._request(ROBOTS_URL)
        robots = RobotFileParser()
        robots.parse(text.splitlines())
        self._robots = robots

    def close(self) -> None:
        self._http.close()

    def get(self, url: str) -> str:
        if self._robots is None:
            raise RuntimeError("client is not open")
        if not path_allowed(url) or not self._robots.can_fetch(self.user_agent, url):
            raise RobotsDenied(url)
        return self._request(url)

    def _request(self, url: str) -> str:
        last = "no response"
        for attempt in range(self.retries):
            self._interval.wait()
            try:
                response = self._http.get(url)
            except httpx.TransportError as exc:
                last = str(exc)
                self._sleep(backoff_seconds(attempt, None))
                continue
            if response.status_code in RETRY_STATUSES:
                last = f"HTTP {response.status_code}"
                self._sleep(backoff_seconds(attempt, response.headers.get("Retry-After")))
                continue
            if response.status_code >= 400:
                raise FetchError(f"{url} returned HTTP {response.status_code}")
            return response.text
        raise FetchError(f"{url} failed after {self.retries} tries ({last})")
