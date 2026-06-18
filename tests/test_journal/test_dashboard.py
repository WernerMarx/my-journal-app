"""Phase 6 — Dashboard endpoint.

Tests for GET /api/v1/dashboard/ which returns aggregated activity data:
total entry count, last-entry date, and per-day mood values for the current
calendar month. All data is strictly scoped to the authenticated user.
"""

import datetime

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.trackers.models import TrackerValue
from tests.factories import EntryFactory, TrackerValueFactory, UserFactory

pytestmark = pytest.mark.django_db

DASHBOARD_URL = "journal:dashboard"


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------


def test_dashboard_requires_auth(api_client):
    response = api_client.get(reverse(DASHBOARD_URL))
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Empty state
# ---------------------------------------------------------------------------


def test_dashboard_empty_user(auth_client):
    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.status_code == 200
    assert response.data["total_entries"] == 0
    assert response.data["last_entry_date"] is None
    assert response.data["current_month_moods"] == {}
    assert response.data["current_month_entry_dates"] == []


# ---------------------------------------------------------------------------
# Total entries
# ---------------------------------------------------------------------------


def test_dashboard_total_entries(auth_client, user):
    EntryFactory(user=user, date="2026-01-01")
    EntryFactory(user=user, date="2026-02-01")
    EntryFactory(user=user, date="2026-03-01")
    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["total_entries"] == 3


def test_dashboard_total_entries_counts_all_time(auth_client, user):
    """Total includes entries outside the current month."""
    today = timezone.localdate()
    last_year = today.replace(year=today.year - 1, month=1, day=1)
    EntryFactory(user=user, date=last_year)
    EntryFactory(user=user, date=today)
    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["total_entries"] == 2


# ---------------------------------------------------------------------------
# Last entry date
# ---------------------------------------------------------------------------


def test_dashboard_last_entry_date(auth_client, user):
    EntryFactory(user=user, date="2026-01-01")
    EntryFactory(user=user, date="2026-03-15")
    EntryFactory(user=user, date="2026-06-10")
    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["last_entry_date"] == "2026-06-10"


def test_dashboard_last_entry_date_none_when_empty(auth_client):
    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["last_entry_date"] is None


# ---------------------------------------------------------------------------
# Current month: entry dates
# ---------------------------------------------------------------------------


def test_dashboard_current_month_entry_dates_included(auth_client, user):
    today = timezone.localdate()
    first_of_month = today.replace(day=1)
    EntryFactory(user=user, date=first_of_month)

    response = auth_client.get(reverse(DASHBOARD_URL))
    assert str(first_of_month) in response.data["current_month_entry_dates"]


def test_dashboard_previous_month_entry_excluded(auth_client, user):
    today = timezone.localdate()
    first_of_month = today.replace(day=1)
    last_month_last_day = first_of_month - datetime.timedelta(days=1)
    last_month_first = last_month_last_day.replace(day=1)

    EntryFactory(user=user, date=last_month_first)

    response = auth_client.get(reverse(DASHBOARD_URL))
    assert str(last_month_first) not in response.data["current_month_entry_dates"]


# ---------------------------------------------------------------------------
# Current month: mood map
# ---------------------------------------------------------------------------


def test_dashboard_current_month_moods_present(auth_client, user):
    """Mood tracker value for a current-month entry appears in the map."""
    today = timezone.localdate()
    first_of_month = today.replace(day=1)

    # The user fixture seeds system trackers including 'mood'
    from apps.trackers.models import Tracker

    mood_tracker = Tracker.objects.get(user=user, key="mood")
    entry = EntryFactory(user=user, date=first_of_month)
    TrackerValueFactory(entry=entry, tracker=mood_tracker, value_number="7.5")

    response = auth_client.get(reverse(DASHBOARD_URL))
    mood_map = response.data["current_month_moods"]
    assert str(first_of_month) in mood_map
    assert float(mood_map[str(first_of_month)]) == pytest.approx(7.5)


def test_dashboard_mood_reads_by_stable_key(auth_client, user):
    """Dashboard locates the mood tracker by key='mood', not by order or id."""
    from apps.trackers.models import Tracker

    today = timezone.localdate()
    first_of_month = today.replace(day=1)

    mood_tracker = Tracker.objects.get(user=user, key="mood")
    entry = EntryFactory(user=user, date=first_of_month)
    TrackerValueFactory(entry=entry, tracker=mood_tracker, value_number="5.0")

    response = auth_client.get(reverse(DASHBOARD_URL))
    # Exactly one day with mood
    assert len(response.data["current_month_moods"]) == 1


def test_dashboard_days_without_mood_absent_from_map(auth_client, user):
    """An entry with no mood value does not produce a map key."""
    today = timezone.localdate()
    first_of_month = today.replace(day=1)
    EntryFactory(user=user, date=first_of_month)

    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["current_month_moods"] == {}


def test_dashboard_previous_month_mood_excluded(auth_client, user):
    """Mood values from prior months are not returned."""
    today = timezone.localdate()
    first_of_month = today.replace(day=1)
    last_month_last_day = first_of_month - datetime.timedelta(days=1)
    last_month_first = last_month_last_day.replace(day=1)

    from apps.trackers.models import Tracker

    mood_tracker = Tracker.objects.get(user=user, key="mood")
    entry = EntryFactory(user=user, date=last_month_first)
    TrackerValueFactory(entry=entry, tracker=mood_tracker, value_number="9.0")

    response = auth_client.get(reverse(DASHBOARD_URL))
    assert str(last_month_first) not in response.data["current_month_moods"]


# ---------------------------------------------------------------------------
# User scoping — other users' data must never appear
# ---------------------------------------------------------------------------


def test_dashboard_total_entries_user_scoped(auth_client, user):
    other = UserFactory()
    EntryFactory(user=other, date="2026-01-01")
    EntryFactory(user=other, date="2026-02-01")
    EntryFactory(user=user, date="2026-03-01")

    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["total_entries"] == 1


def test_dashboard_last_entry_date_user_scoped(auth_client, user):
    other = UserFactory()
    # Other user has a more recent entry — must not bleed through
    EntryFactory(user=other, date="2026-06-18")
    EntryFactory(user=user, date="2026-06-01")

    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["last_entry_date"] == "2026-06-01"


def test_dashboard_mood_user_scoped(auth_client, user):
    """Another user's mood values must not appear in this user's mood map."""
    other = UserFactory()
    today = timezone.localdate()
    first_of_month = today.replace(day=1)

    # other user has a mood entry this month
    from apps.trackers.models import Tracker

    other_mood = Tracker.objects.get(user=other, key="mood")
    other_entry = EntryFactory(user=other, date=first_of_month)
    TrackerValueFactory(entry=other_entry, tracker=other_mood, value_number="9.0")

    response = auth_client.get(reverse(DASHBOARD_URL))
    assert response.data["current_month_moods"] == {}


# ---------------------------------------------------------------------------
# Month navigation — explicit year/month query params
# ---------------------------------------------------------------------------


def test_dashboard_explicit_month_returns_that_months_data(auth_client, user):
    """?year=2026&month=1 returns January 2026 data."""
    from apps.trackers.models import Tracker

    mood_tracker = Tracker.objects.get(user=user, key="mood")
    entry = EntryFactory(user=user, date="2026-01-15")
    TrackerValueFactory(entry=entry, tracker=mood_tracker, value_number="6.0")

    response = auth_client.get(reverse(DASHBOARD_URL), {"year": 2026, "month": 1})
    assert response.status_code == 200
    assert "2026-01-15" in response.data["current_month_entry_dates"]
    assert "2026-01-15" in response.data["current_month_moods"]


def test_dashboard_explicit_month_excludes_other_months(auth_client, user):
    """Mood entries outside the requested month are not returned."""
    from apps.trackers.models import Tracker

    mood_tracker = Tracker.objects.get(user=user, key="mood")
    entry = EntryFactory(user=user, date="2026-02-10")
    TrackerValueFactory(entry=entry, tracker=mood_tracker, value_number="8.0")

    # Request January — February data must not bleed in
    response = auth_client.get(reverse(DASHBOARD_URL), {"year": 2026, "month": 1})
    assert "2026-02-10" not in response.data["current_month_moods"]


def test_dashboard_invalid_month_returns_400(auth_client):
    response = auth_client.get(reverse(DASHBOARD_URL), {"year": 2026, "month": 13})
    assert response.status_code == 400


def test_dashboard_invalid_year_returns_400(auth_client):
    response = auth_client.get(reverse(DASHBOARD_URL), {"year": "abc", "month": 1})
    assert response.status_code == 400


def test_dashboard_total_and_last_entry_unaffected_by_month_param(auth_client, user):
    """Total entries and last-entry date are all-time, regardless of month param."""
    EntryFactory(user=user, date="2025-11-01")
    EntryFactory(user=user, date="2026-06-10")

    # Request January 2026 — aggregates still cover all time
    response = auth_client.get(reverse(DASHBOARD_URL), {"year": 2026, "month": 1})
    assert response.data["total_entries"] == 2
    assert response.data["last_entry_date"] == "2026-06-10"
