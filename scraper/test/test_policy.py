import httpx
import pytest

from nonogram_scraper.client import PoliteClient, RobotsDenied
from nonogram_scraper.policy import Interval, backoff_seconds
from nonogram_scraper.urls import path_allowed

ROBOTS = "User-agent: *\nDisallow: /nonogramprint/\nDisallow: /files/\nDisallow: /search\n"


def test_path_policy_matches_robots_txt():
    assert path_allowed("https://www.nonograms.org/nonograms")
    assert path_allowed("https://www.nonograms.org/nonograms/p/2")
    assert path_allowed("https://www.nonograms.org/nonograms/i/83774")
    assert path_allowed("https://www.nonograms.org/robots.txt")
    assert not path_allowed("https://www.nonograms.org/nonogramprint/i/1")
    assert not path_allowed("https://www.nonograms.org/nonograms/size/small")
    assert not path_allowed("https://www.nonograms.org/files/nonograms/small/x.png")
    assert not path_allowed("https://www.nonograms.org/search")
    assert not path_allowed("https://www.nonograms.org/user/81627")
    assert not path_allowed("https://example.com/nonograms/i/1")


def test_backoff_honors_retry_after_then_grows():
    assert backoff_seconds(3, "2") == 2
    assert backoff_seconds(0, None) == 1
    assert backoff_seconds(2, None) == 4
    assert backoff_seconds(20, None) == 60


def test_interval_spaces_calls():
    clock = {"t": 0.0}
    slept = []

    def now():
        return clock["t"]

    def sleep(seconds):
        slept.append(seconds)
        clock["t"] += seconds

    interval = Interval(1.0, 0.0, sleep=sleep, now=now)
    interval.wait()
    interval.wait()
    interval.wait()
    assert slept == [1.0, 1.0]


def test_client_does_not_fetch_disallowed_urls():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=ROBOTS)
        raise AssertionError(request.url)

    with PoliteClient(delay=0, jitter=0, transport=httpx.MockTransport(handler), sleep=lambda _s: None) as client:
        with pytest.raises(RobotsDenied):
            client.get("https://www.nonograms.org/nonogramprint/i/1")


def test_client_retries_429():
    hits = {"puzzle": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=ROBOTS)
        hits["puzzle"] += 1
        if hits["puzzle"] == 1:
            return httpx.Response(429, headers={"Retry-After": "0"})
        return httpx.Response(200, text="ok")

    slept = []
    with PoliteClient(
        delay=0,
        jitter=0,
        transport=httpx.MockTransport(handler),
        sleep=slept.append,
    ) as client:
        assert client.get("https://www.nonograms.org/nonograms/i/1") == "ok"
    assert hits["puzzle"] == 2
    assert slept == [0.0]
