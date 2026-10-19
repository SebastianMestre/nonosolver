import json

import pytest

from nonogram_scraper.crawl import CrawlError, crawl
from nonogram_scraper.join import bundle
from nonogram_scraper.store import read_next_page
from nonogram_scraper.urls import puzzle_url

PUZZLE_HTML = """
<table id="nonogram_table">
  <tr><td class="nmtt"><table><tr>
    <td id="nmv0_0"><div>1</div></td>
    <td id="nmv1_0"><div>1</div></td>
  </tr></table></td></tr>
  <tr>
    <td class="nmtl"><table>
      <tr><td id="nmh0_0"><div>2</div></td></tr>
      <tr><td class="num_empty"><div>&nbsp;</div></td></tr>
    </table></td>
    <td class="nmtc"><table>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
    </table></td>
  </tr>
</table>
"""

CATALOG = """
<table class="nonogram_list">
  <tr><td><a href="https://www.nonograms.org/nonograms/i/5">#5</a></td></tr>
  <tr><td><a href="https://www.nonograms.org/nonograms/i/4">#4</a></td></tr>
</table>
<a href="https://www.nonograms.org/nonograms/p/2">2</a>
"""


class FakeClient:
    def __init__(self):
        self.urls = []

    def get(self, url):
        self.urls.append(url)
        if url.endswith("/nonograms") or "/nonograms/p/" in url:
            return CATALOG
        return PUZZLE_HTML


def test_crawl_stops_at_limit_and_skips_existing(tmp_path):
    client = FakeClient()
    saved = crawl(client, tmp_path, limit=1)
    assert saved == ["5"]
    assert puzzle_url("5") in client.urls
    assert puzzle_url("4") not in client.urls

    again = FakeClient()
    saved = crawl(again, tmp_path, limit=1)
    assert saved == ["5", "4"]
    assert puzzle_url("5") not in again.urls
    assert puzzle_url("4") in again.urls

    document = json.loads((tmp_path / "5.json").read_text(encoding="utf-8"))
    assert document == {
        "url": puzzle_url("5"),
        "puzzle": {"rows": [[2], []], "cols": [[1], [1]]},
    }
    bundled = bundle(tmp_path)
    assert [item["url"] for item in bundled] == [puzzle_url("5"), puzzle_url("4")]


PAGE_2 = """
<table class="nonogram_list">
  <tr><td><a href="https://www.nonograms.org/nonograms/i/3">#3</a></td></tr>
</table>
<a href="https://www.nonograms.org/nonograms/p/2">2</a>
"""


class PagedClient:
    def __init__(self):
        self.urls = []

    def get(self, url):
        self.urls.append(url)
        if url.endswith("/nonograms/p/2"):
            return PAGE_2
        if url.endswith("/nonograms") or "/nonograms/p/" in url:
            return CATALOG
        return PUZZLE_HTML


def test_a_finished_page_is_skipped_on_the_next_run(tmp_path):
    first = PagedClient()
    crawl(first, tmp_path, end_page=1)
    assert read_next_page(tmp_path) == 2
    assert any(url.endswith("/nonograms") for url in first.urls)

    second = PagedClient()
    saved = crawl(second, tmp_path)
    assert saved == ["3"]
    assert read_next_page(tmp_path) == 3
    assert not any(url.rstrip("/").endswith("/nonograms") for url in second.urls)
    assert puzzle_url("5") not in second.urls
    assert puzzle_url("3") in second.urls


def test_stopping_mid_page_does_not_advance(tmp_path):
    crawl(FakeClient(), tmp_path, limit=1)
    assert read_next_page(tmp_path) == 1


def test_stops_when_pages_keep_failing_to_parse(tmp_path):
    class Bad:
        def __init__(self):
            self.n = 0

        def get(self, url):
            self.n += 1
            return "<html></html>"

    bad = Bad()
    with pytest.raises(CrawlError):
        crawl(bad, tmp_path, ids=["1", "2", "3", "4", "5", "6"])
    assert bad.n == 5
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["ids"] == []
