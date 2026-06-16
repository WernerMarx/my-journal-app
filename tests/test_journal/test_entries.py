"""Phase 1 — Entry CRUD.

One editable entry per user per day, addressed by date, strictly scoped to the
authenticated owner. Covers create/list/retrieve/update/delete, the one-per-day
rule, the authz/negative cases, and the /entries/today/ convenience endpoint.
"""

import pytest
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.journal.models import Entry
from tests.factories import EntryFactory, UserFactory

pytestmark = pytest.mark.django_db

LIST_URL = "journal:entry-list"
TODAY_URL = "journal:entry-today"


def detail_url(date: str) -> str:
    return reverse("journal:entry-detail", kwargs={"date": date})


# --- Create ----------------------------------------------------------------


def test_create_entry(auth_client, user):
    response = auth_client.post(
        reverse(LIST_URL),
        {"date": "2026-06-16", "title": "Morning", "body": "Felt good."},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["date"] == "2026-06-16"
    assert response.data["title"] == "Morning"
    assert response.data["body"] == "Felt good."


def test_create_assigns_entry_to_request_user(auth_client, user):
    auth_client.post(
        reverse(LIST_URL),
        {"date": "2026-06-16", "title": "t", "body": "b"},
        format="json",
    )
    entry = Entry.objects.get(date="2026-06-16")
    assert entry.user == user


def test_user_is_not_settable_from_payload(auth_client, user):
    """A client cannot assign an entry to someone else by sending a user id."""
    other = UserFactory()
    auth_client.post(
        reverse(LIST_URL),
        {"date": "2026-06-16", "title": "t", "body": "b", "user": other.pk},
        format="json",
    )
    entry = Entry.objects.get(date="2026-06-16")
    assert entry.user == user


def test_one_entry_per_day_is_enforced(auth_client, user):
    payload = {"date": "2026-06-16", "title": "t", "body": "b"}
    assert auth_client.post(reverse(LIST_URL), payload, format="json").status_code == 201

    second = auth_client.post(reverse(LIST_URL), payload, format="json")
    assert second.status_code == 400
    assert Entry.objects.filter(user=user, date="2026-06-16").count() == 1


# --- List ------------------------------------------------------------------


def test_list_returns_only_own_entries(auth_client, user):
    EntryFactory(user=user, date="2026-06-16")
    EntryFactory(user=UserFactory(), date="2026-06-16")

    response = auth_client.get(reverse(LIST_URL))

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["date"] == "2026-06-16"


# --- Retrieve --------------------------------------------------------------


def test_retrieve_entry_by_date(auth_client, user):
    EntryFactory(user=user, date="2026-06-16", title="Found me")

    response = auth_client.get(detail_url("2026-06-16"))

    assert response.status_code == 200
    assert response.data["title"] == "Found me"


# --- Update ----------------------------------------------------------------


def test_update_changes_body_and_bumps_updated_at(auth_client, user):
    created = auth_client.post(
        reverse(LIST_URL),
        {"date": "2026-06-16", "title": "t", "body": "old"},
        format="json",
    )
    before = parse_datetime(created.data["updated_at"])

    response = auth_client.patch(detail_url("2026-06-16"), {"body": "new"}, format="json")

    assert response.status_code == 200
    assert response.data["body"] == "new"
    assert parse_datetime(response.data["updated_at"]) > before


# --- Delete ----------------------------------------------------------------


def test_delete_entry(auth_client, user):
    EntryFactory(user=user, date="2026-06-16")

    response = auth_client.delete(detail_url("2026-06-16"))

    assert response.status_code == 204
    assert not Entry.objects.filter(date="2026-06-16").exists()


# --- Authorization / negative cases ----------------------------------------


def test_cannot_retrieve_another_users_entry(auth_client, user):
    EntryFactory(user=UserFactory(), date="2026-06-16")

    response = auth_client.get(detail_url("2026-06-16"))

    assert response.status_code == 404


def test_cannot_update_another_users_entry(auth_client, user):
    other_entry = EntryFactory(user=UserFactory(), date="2026-06-16", body="secret")

    response = auth_client.patch(detail_url("2026-06-16"), {"body": "hacked"}, format="json")

    assert response.status_code == 404
    other_entry.refresh_from_db()
    assert other_entry.body == "secret"


def test_entry_list_requires_authentication(api_client):
    assert api_client.get(reverse(LIST_URL)).status_code == 401


def test_entry_detail_requires_authentication(api_client):
    assert api_client.get(detail_url("2026-06-16")).status_code == 401


# --- today convenience -----------------------------------------------------


def test_today_returns_todays_entry(auth_client, user):
    today = timezone.localdate()
    EntryFactory(user=user, date=today)

    response = auth_client.get(reverse(TODAY_URL))

    assert response.status_code == 200
    assert response.data["date"] == today.isoformat()


def test_today_returns_404_when_no_entry_yet(auth_client, user):
    response = auth_client.get(reverse(TODAY_URL))
    assert response.status_code == 404
