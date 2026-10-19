from nonogram_scraper.parse import parse_catalog, parse_puzzle

# The packed ``var d`` from puzzle #83774. The page does not include a table.
PACKED_83774 = (
    "var d=[[281,1782,1249,1806],[7,45,44,48],[40,53,86,87],[33,25,57,67],"
    "[36,4,57,8],[4,36,8,58],[45,42,84,14],[13,10,27,13],[15,11,28,14],"
    "[16,16,28,17],[16,11,28,20],[16,16,28,18],[14,17,28,16],[16,16,28,19],"
    "[19,12,28,20],[17,11,28,14],[15,13,28,15],[76,70,70,14],[20,2,10,40],"
    "[21,3,35,46],[21,3,33,45],[23,3,20,42],[21,3,46,41],[25,3,24,47],"
    "[22,5,49,41],[26,3,26,41],[26,5,29,42],[21,3,43,43],[21,3,31,44],"
    "[23,6,15,45],[24,3,22,42],[28,3,42,43],[23,6,13,44],[22,3,51,44],"
    "[24,3,54,47],[22,3,18,47],[25,3,24,41],[21,4,29,42],[25,3,24,42],"
    "[28,3,48,44],[23,6,17,46],[22,8,11,43],[28,3,42,45],[23,3,52,47],"
    "[27,4,35,46],[22,3,36,45],[27,3,28,45],[21,3,46,47],[26,3,38,47],"
    "[27,3,28,44],[28,3,42,41],[22,3,18,46],[28,3,45,47],[27,3,40,41],[27,3,40,47]];"
)

PUZZLE_URL = "https://www.nonograms.org/nonograms/i/83774"

# Numbers are the published clues for #83774 (8 by 7). Header cells with
# no number have no id, matching the site. Column ids are listed out of
# document order so the parser has to sort on the index.
PUZZLE_HTML = """
<table id="nonogram_table">
  <tr>
    <td id="nmti"></td>
    <td class="nmtt">
      <table>
        <tr>
          <td id="nmv3_0" class="num"><div>6</div></td>
          <td id="nmv0_0" class="num"><div>1</div></td>
          <td id="nmv1_0" class="num"><div>3</div></td>
          <td id="nmv2_0" class="num"><div>6</div></td>
          <td id="nmv4_0" class="num"><div>4</div></td>
          <td id="nmv5_0" class="num"><div>5</div></td>
          <td id="nmv6_0" class="num"><div>5</div></td>
          <td id="nmv7_0" class="num"><div>3</div></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="nmtl">
      <table>
        <tr>
          <td id="nmh0_0" class="num"><div>1</div></td>
          <td id="nmh1_0" class="num"><div>1</div></td>
        </tr>
        <tr>
          <td class="num_empty"><div>&nbsp;</div></td>
          <td id="nmh0_1" class="num"><div>3</div></td>
        </tr>
        <tr>
          <td class="num_empty"><div>&nbsp;</div></td>
          <td id="nmh0_2" class="num"><div>7</div></td>
        </tr>
        <tr>
          <td class="num_empty"><div>&nbsp;</div></td>
          <td id="nmh0_3" class="num"><div>6</div></td>
        </tr>
        <tr>
          <td class="num_empty"><div>&nbsp;</div></td>
          <td id="nmh0_4" class="num"><div>6</div></td>
        </tr>
        <tr>
          <td class="num_empty"><div>&nbsp;</div></td>
          <td id="nmh0_5" class="num"><div>6</div></td>
        </tr>
        <tr>
          <td id="nmh0_6" class="num"><div>1</div></td>
          <td id="nmh1_6" class="num"><div>2</div></td>
        </tr>
      </table>
    </td>
    <td class="nmtc">
      <table>
        <tr id="l0"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr id="l1"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr id="l2"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr id="l3"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr id="l4"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr id="l5"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr id="l6"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      </table>
    </td>
  </tr>
</table>
"""

# Column numbers sit in the bottom header rows. A lone 0 becomes [].
SPARSE_HTML = """
<table id="nonogram_table">
  <tr>
    <td class="nmtt">
      <table>
        <tr>
          <td class="num_empty"><div>&nbsp;</div></td>
          <td class="num_empty"><div>&nbsp;</div></td>
        </tr>
        <tr>
          <td id="nmv0_0" class="num"><div>1</div></td>
          <td class="num_empty"><div>&nbsp;</div></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="nmtl">
      <table>
        <tr>
          <td class="num_empty"><div>&nbsp;</div></td>
          <td id="nmh0_0" class="num"><div>1</div></td>
        </tr>
        <tr>
          <td id="nmh0_1" class="num"><div>0</div></td>
          <td class="num_empty"><div>&nbsp;</div></td>
        </tr>
      </table>
    </td>
    <td class="nmtc">
      <table>
        <tr><td></td><td></td></tr>
        <tr><td></td><td></td></tr>
      </table>
    </td>
  </tr>
</table>
"""

CATALOG_HTML = """
<a href="https://www.nonograms.org/nonograms/i/999">sidebar</a>
<table class="nonogram_list">
  <tr>
    <td>
      <a href="https://www.nonograms.org/nonograms/i/83774">#83774</a>
      <a href="https://www.nonograms.org/nonograms/i/83774">again</a>
    </td>
  </tr>
  <tr><td><a href="/nonograms/i/10">#10</a></td></tr>
</table>
<a href="https://www.nonograms.org/nonograms/p/2">2</a>
<a href="https://www.nonograms.org/nonograms/p/1429">1429</a>
"""


def test_decodes_packed_83774():
    document = parse_puzzle(f"<script>{PACKED_83774}</script>", PUZZLE_URL)
    assert document["puzzle"]["rows"] == [[1, 1], [3], [7], [6], [6], [6], [1, 2]]
    assert document["puzzle"]["cols"] == [[1], [3], [6], [6], [4], [5], [5], [3]]


def test_parses_83774_clues():
    document = parse_puzzle(PUZZLE_HTML, PUZZLE_URL)
    assert document["url"] == PUZZLE_URL
    assert document["puzzle"]["rows"] == [[1, 1], [3], [7], [6], [6], [6], [1, 2]]
    assert document["puzzle"]["cols"] == [[1], [3], [6], [6], [4], [5], [5], [3]]


def test_empty_line_and_zero():
    document = parse_puzzle(SPARSE_HTML, "https://www.nonograms.org/nonograms/i/1")
    assert document["puzzle"]["rows"] == [[1], []]
    assert document["puzzle"]["cols"] == [[1], []]


def test_clues_that_do_not_fit_raise():
    html = """
    <table id="nonogram_table">
      <tr><td class="nmtt"><table><tr>
        <td id="nmv0_0"><div>3</div></td>
      </tr></table></td></tr>
      <tr>
        <td class="nmtl"><table><tr>
          <td id="nmh0_0"><div>1</div></td>
        </tr></table></td>
        <td class="nmtc"><table><tr><td></td></tr></table></td>
      </tr>
    </table>
    """
    try:
        parse_puzzle(html, PUZZLE_URL)
    except ValueError as exc:
        assert "do not fit" in str(exc)
    else:
        raise AssertionError("expected ValueError")


def test_catalog_ignores_links_outside_the_list():
    ids, last = parse_catalog(CATALOG_HTML)
    assert ids == ["83774", "10"]
    assert last == 1429
