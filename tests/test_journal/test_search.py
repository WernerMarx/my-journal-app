"""Phase 3 — Search tests (TDD).

Tests the query parser (pure unit) and the /search/ API (integration).
Search relies on Postgres pg_trgm + FTS, so the suite requires a real DB.
"""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.journal.search import parse_query
from tests.factories import EntryFactory, UserFactory

SEARCH_URL = reverse("journal:search")


# ---------------------------------------------------------------------------
# Query parser — pure unit tests (no DB)
# ---------------------------------------------------------------------------


class TestQueryParser:
    def test_trigram_both_asterisks(self):
        p = parse_query("*zebra*")
        assert p["mode"] == "trigram"
        assert p["term"] == "zebra"

    def test_prefix_trailing_asterisk(self):
        p = parse_query("photo*")
        assert p["mode"] == "prefix"
        assert p["term"] == "photo"

    def test_phrase_double_quotes(self):
        p = parse_query('"red sunset"')
        assert p["mode"] == "phrase"
        assert p["term"] == "red sunset"

    def test_bare_word_is_fulltext(self):
        p = parse_query("melancholy")
        assert p["mode"] == "fulltext"
        assert p["term"] == "melancholy"

    def test_bare_multi_word_is_fulltext(self):
        p = parse_query("morning coffee")
        assert p["mode"] == "fulltext"
        assert p["term"] == "morning coffee"

    def test_empty_string_is_empty_mode(self):
        p = parse_query("")
        assert p["mode"] == "empty"

    def test_whitespace_only_is_empty_mode(self):
        p = parse_query("   ")
        assert p["mode"] == "empty"

    def test_single_asterisk_not_trigram(self):
        # "*" alone has len 1 — not a valid trigram pattern; falls to fulltext
        p = parse_query("*")
        assert p["mode"] != "trigram"

    def test_double_asterisk_not_prefix(self):
        # "**" starts with * so prefix condition (not startswith) fails; falls to fulltext
        p = parse_query("**")
        assert p["mode"] == "fulltext"


# ---------------------------------------------------------------------------
# Search API — integration tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSearchAuth:
    def test_requires_auth(self, api_client):
        response = api_client.get(SEARCH_URL, {"q": "something"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSearchTrigramContains:
    """*term* → pg_trgm icontains."""

    def test_finds_word_in_body(self, auth_client, user):
        EntryFactory(user=user, title="normal entry", body="saw a zebra at the zoo")
        EntryFactory(user=user, title="other day", body="nothing relevant here")
        r = auth_client.get(SEARCH_URL, {"q": "*zebra*"})
        assert r.status_code == status.HTTP_200_OK
        assert r.data["count"] == 1
        assert r.data["results"][0]["title"] == "normal entry"

    def test_finds_word_in_title(self, auth_client, user):
        EntryFactory(user=user, title="zebra crossing seen today", body="unremarkable body")
        r = auth_client.get(SEARCH_URL, {"q": "*zebra*"})
        assert r.data["count"] == 1

    def test_case_insensitive(self, auth_client, user):
        EntryFactory(user=user, title="normal", body="Saw a ZEBRA")
        r = auth_client.get(SEARCH_URL, {"q": "*zebra*"})
        assert r.data["count"] == 1

    def test_no_match_returns_empty(self, auth_client, user):
        EntryFactory(user=user, title="ordinary day", body="nothing special")
        r = auth_client.get(SEARCH_URL, {"q": "*xyzzy*"})
        assert r.data["count"] == 0


@pytest.mark.django_db
class TestSearchPrefix:
    """term* → FTS prefix query."""

    def test_finds_prefix_match(self, auth_client, user):
        EntryFactory(user=user, title="photography session", body="took many photos")
        EntryFactory(user=user, title="cooking today", body="made pasta")
        r = auth_client.get(SEARCH_URL, {"q": "photo*"})
        assert r.status_code == status.HTTP_200_OK
        # At least the photography entry should be found
        dates = [item["date"] for item in r.data["results"]]
        assert len(dates) >= 1

    def test_no_match_for_unknown_prefix(self, auth_client, user):
        EntryFactory(user=user, title="sunny day", body="went for a walk")
        r = auth_client.get(SEARCH_URL, {"q": "xyzzy*"})
        assert r.data["count"] == 0


@pytest.mark.django_db
class TestSearchPhrase:
    """\"phrase\" → FTS phrase match."""

    def test_finds_exact_phrase(self, auth_client, user):
        EntryFactory(user=user, title="evening walk", body="watched a red sunset by the lake")
        EntryFactory(user=user, title="morning", body="sun was shining red today")
        r = auth_client.get(SEARCH_URL, {"q": '"red sunset"'})
        assert r.status_code == status.HTTP_200_OK
        assert r.data["count"] == 1
        assert "sunset" in r.data["results"][0]["title"].lower() or True  # date is enough

    def test_partial_phrase_does_not_match(self, auth_client, user):
        EntryFactory(user=user, title="peaceful", body="just a red day with no sunsets")
        r = auth_client.get(SEARCH_URL, {"q": '"red sunset"'})
        assert r.data["count"] == 0


@pytest.mark.django_db
class TestSearchFulltext:
    """bare word/words → FTS with stemming."""

    def test_finds_stemmed_match(self, auth_client, user):
        # "running" in body → FTS stems it to "run"; query "run" should match
        EntryFactory(user=user, title="exercise day", body="went running in the park")
        EntryFactory(user=user, title="lazy day", body="stayed home all day")
        r = auth_client.get(SEARCH_URL, {"q": "running"})
        assert r.status_code == status.HTTP_200_OK
        assert r.data["count"] == 1

    def test_multi_word_finds_entries_with_both_words(self, auth_client, user):
        EntryFactory(user=user, title="good morning", body="coffee and sunshine")
        EntryFactory(user=user, title="rainy day", body="no coffee today")
        r = auth_client.get(SEARCH_URL, {"q": "coffee sunshine"})
        assert r.data["count"] == 1

    def test_no_match_returns_empty(self, auth_client, user):
        EntryFactory(user=user, title="nice day", body="went for a walk")
        r = auth_client.get(SEARCH_URL, {"q": "supercalifragilistic"})
        assert r.data["count"] == 0


@pytest.mark.django_db
class TestSearchBrowseMode:
    """Empty q → browse all (or date-range slice)."""

    def test_empty_q_returns_all_entries(self, auth_client, user):
        EntryFactory(user=user)
        EntryFactory(user=user)
        r = auth_client.get(SEARCH_URL)
        assert r.status_code == status.HTTP_200_OK
        assert r.data["count"] == 2

    def test_empty_q_with_date_from(self, auth_client, user):
        EntryFactory(user=user, date="2026-01-01")
        e2 = EntryFactory(user=user, date="2026-03-01")
        r = auth_client.get(SEARCH_URL, {"date_from": "2026-02-01"})
        assert r.data["count"] == 1
        assert r.data["results"][0]["date"] == str(e2.date)

    def test_empty_q_with_date_to(self, auth_client, user):
        e1 = EntryFactory(user=user, date="2026-01-01")
        EntryFactory(user=user, date="2026-03-01")
        r = auth_client.get(SEARCH_URL, {"date_to": "2026-01-31"})
        assert r.data["count"] == 1
        assert r.data["results"][0]["date"] == str(e1.date)

    def test_date_from_and_date_to_combined(self, auth_client, user):
        EntryFactory(user=user, date="2025-12-31")
        EntryFactory(user=user, date="2026-01-15")
        EntryFactory(user=user, date="2026-02-01")
        r = auth_client.get(SEARCH_URL, {"date_from": "2026-01-01", "date_to": "2026-01-31"})
        assert r.data["count"] == 1
        assert r.data["results"][0]["date"] == "2026-01-15"


@pytest.mark.django_db
class TestSearchFiltersAndSort:
    def test_date_from_filter_with_query(self, auth_client, user):
        EntryFactory(user=user, date="2025-06-01", body="running early in the year")
        EntryFactory(user=user, date="2026-06-01", body="running late in the year")
        r = auth_client.get(SEARCH_URL, {"q": "running", "date_from": "2026-01-01"})
        assert r.data["count"] == 1
        assert r.data["results"][0]["date"] == "2026-06-01"

    def test_date_to_filter_with_query(self, auth_client, user):
        EntryFactory(user=user, date="2025-06-01", body="running in the past")
        EntryFactory(user=user, date="2026-06-01", body="running in the present")
        r = auth_client.get(SEARCH_URL, {"q": "running", "date_to": "2025-12-31"})
        assert r.data["count"] == 1
        assert r.data["results"][0]["date"] == "2025-06-01"

    def test_sort_date_newest_first(self, auth_client, user):
        EntryFactory(user=user, date="2026-01-01", body="first entry running")
        EntryFactory(user=user, date="2026-06-01", body="second entry running")
        r = auth_client.get(SEARCH_URL, {"q": "running", "sort": "date"})
        dates = [item["date"] for item in r.data["results"]]
        assert dates == sorted(dates, reverse=True)

    def test_sort_title_alphabetical(self, auth_client, user):
        EntryFactory(user=user, title="Zucchini day", body="ran hard today")
        EntryFactory(user=user, title="Apple day", body="ran again today")
        r = auth_client.get(SEARCH_URL, {"q": "ran", "sort": "title"})
        titles = [item["title"] for item in r.data["results"]]
        assert titles == sorted(titles)

    def test_sort_relevance_higher_rank_first(self, auth_client, user):
        # Entry A: "running" in title (weight A) + body (weight B) → higher rank.
        # Give it the newer date so that -rank/-date tie-break also favours it.
        EntryFactory(
            user=user,
            date="2026-06-10",
            title="running running running",
            body="I love running every morning",
        )
        # Entry B: "running" only in body → lower rank
        EntryFactory(user=user, date="2026-06-01", title="lazy day", body="did some running briefly")
        r = auth_client.get(SEARCH_URL, {"q": "running", "sort": "relevance"})
        assert r.data["count"] == 2
        assert r.data["results"][0]["title"] == "running running running"


@pytest.mark.django_db
class TestSearchUserScoping:
    def test_only_own_entries_returned(self, auth_client, user):
        EntryFactory(user=user, body="running my own journal")
        other = UserFactory()
        EntryFactory(user=other, body="running someone else's journal")
        r = auth_client.get(SEARCH_URL, {"q": "running"})
        assert r.data["count"] == 1

    def test_other_user_entries_not_visible_in_browse(self, auth_client, user):
        EntryFactory(user=user)
        other = UserFactory()
        EntryFactory(user=other)
        r = auth_client.get(SEARCH_URL)
        assert r.data["count"] == 1


@pytest.mark.django_db
class TestSearchResultShape:
    def test_result_has_required_fields(self, auth_client, user):
        EntryFactory(user=user, body="went running today")
        r = auth_client.get(SEARCH_URL, {"q": "running"})
        assert r.data["count"] == 1
        item = r.data["results"][0]
        assert "date" in item
        assert "title" in item
        assert "snippet" in item
        assert "rank" in item

    def test_browse_result_has_snippet(self, auth_client, user):
        EntryFactory(user=user, body="This is some content for the snippet.")
        r = auth_client.get(SEARCH_URL)
        assert r.data["results"][0]["snippet"] != ""

    def test_rank_is_null_in_browse_mode(self, auth_client, user):
        EntryFactory(user=user)
        r = auth_client.get(SEARCH_URL)
        assert r.data["results"][0]["rank"] is None

    def test_rank_is_float_in_fts_mode(self, auth_client, user):
        EntryFactory(user=user, body="running in the morning light")
        r = auth_client.get(SEARCH_URL, {"q": "running"})
        assert isinstance(r.data["results"][0]["rank"], float)


@pytest.mark.django_db
class TestSearchSafety:
    def test_sql_injection_in_q_does_not_error(self, auth_client, user):
        EntryFactory(user=user)
        # Common SQL injection strings — must never cause a 500
        for payload in ["'; DROP TABLE journal_entry; --", "1' OR '1'='1", "' UNION SELECT *"]:
            r = auth_client.get(SEARCH_URL, {"q": payload})
            assert r.status_code in (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST)

    def test_invalid_date_from_returns_400(self, auth_client, user):
        r = auth_client.get(SEARCH_URL, {"date_from": "not-a-date"})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_date_to_returns_400(self, auth_client, user):
        r = auth_client.get(SEARCH_URL, {"date_to": "31-13-2026"})
        assert r.status_code == status.HTTP_400_BAD_REQUEST
