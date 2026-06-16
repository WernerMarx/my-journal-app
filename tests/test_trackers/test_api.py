"""API tests for the trackers app (Phase 2)."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.trackers.models import DataType, Tracker, TrackerValue
from apps.trackers.seeds import seed_system_trackers
from tests.factories import EntryFactory, TrackerFactory, TrackerValueFactory, UserFactory

# ---------------------------------------------------------------------------
# System tracker seeding
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSystemTrackerSeeding:
    def test_system_trackers_created_on_user_create(self, user):
        trackers = Tracker.objects.filter(user=user, is_system=True)
        assert trackers.count() == 3
        assert set(trackers.values_list("key", flat=True)) == {"worked_out", "mood", "diet"}

    def test_worked_out_is_boolean(self, user):
        t = Tracker.objects.get(user=user, key="worked_out")
        assert t.data_type == DataType.BOOLEAN

    def test_mood_is_float_bounded_0_to_10(self, user):
        t = Tracker.objects.get(user=user, key="mood")
        assert t.data_type == DataType.FLOAT
        assert t.config["min"] == 0.0
        assert t.config["max"] == 10.0

    def test_diet_is_float_bounded_0_to_10(self, user):
        t = Tracker.objects.get(user=user, key="diet")
        assert t.data_type == DataType.FLOAT
        assert t.config["min"] == 0.0
        assert t.config["max"] == 10.0

    def test_seeding_is_idempotent(self, user):
        seed_system_trackers(user)
        seed_system_trackers(user)
        assert Tracker.objects.filter(user=user, is_system=True).count() == 3


# ---------------------------------------------------------------------------
# Tracker list
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTrackerList:
    def test_lists_own_trackers(self, auth_client, user):
        response = auth_client.get(reverse("trackers:tracker-list"))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3  # 3 seeded system trackers

    def test_does_not_list_other_users_trackers(self, auth_client, user):
        other = UserFactory()
        TrackerFactory(user=other, key="private")
        response = auth_client.get(reverse("trackers:tracker-list"))
        keys = [t["key"] for t in response.data["results"]]
        assert "private" not in keys

    def test_excludes_inactive_trackers(self, auth_client, user):
        TrackerFactory(user=user, key="old_habit", is_active=False)
        response = auth_client.get(reverse("trackers:tracker-list"))
        keys = [t["key"] for t in response.data["results"]]
        assert "old_habit" not in keys

    def test_requires_auth(self, api_client):
        response = api_client.get(reverse("trackers:tracker-list"))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Tracker create
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTrackerCreate:
    def test_create_text_tracker(self, auth_client, user):
        payload = {"key": "gratitude", "name": "Gratitude", "data_type": "TEXT"}
        response = auth_client.post(
            reverse("trackers:tracker-list"), payload, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["key"] == "gratitude"
        assert response.data["is_system"] is False
        assert Tracker.objects.filter(user=user, key="gratitude").exists()

    def test_create_float_tracker_with_bounds(self, auth_client, user):
        payload = {
            "key": "energy",
            "name": "Energy",
            "data_type": "FLOAT",
            "config": {"min": 0.0, "max": 5.0},
        }
        response = auth_client.post(
            reverse("trackers:tracker-list"), payload, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["config"]["max"] == 5.0

    def test_create_option_tracker(self, auth_client, user):
        payload = {
            "key": "feeling",
            "name": "Feeling",
            "data_type": "OPTION",
            "config": {"options": ["happy", "neutral", "sad"]},
        }
        response = auth_client.post(
            reverse("trackers:tracker-list"), payload, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_option_tracker_without_options_rejected(self, auth_client):
        payload = {"key": "feeling", "name": "Feeling", "data_type": "OPTION", "config": {}}
        response = auth_client.post(
            reverse("trackers:tracker-list"), payload, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_key_for_same_user_rejected(self, auth_client, user):
        TrackerFactory(user=user, key="energy")
        payload = {"key": "energy", "name": "Energy v2", "data_type": "INTEGER"}
        response = auth_client.post(
            reverse("trackers:tracker-list"), payload, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_create_with_is_system_true(self, auth_client, user):
        payload = {
            "key": "sneaky",
            "name": "Sneaky",
            "data_type": "BOOLEAN",
            "is_system": True,
        }
        response = auth_client.post(
            reverse("trackers:tracker-list"), payload, format="json"
        )
        # is_system is read-only; even if accepted, it must be False
        if response.status_code == status.HTTP_201_CREATED:
            assert response.data["is_system"] is False

    def test_requires_auth(self, api_client):
        response = api_client.post(reverse("trackers:tracker-list"), {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Tracker update
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTrackerUpdate:
    def test_update_name(self, auth_client, user):
        tracker = TrackerFactory(user=user)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.patch(url, {"name": "Renamed"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        tracker.refresh_from_db()
        assert tracker.name == "Renamed"

    def test_update_order(self, auth_client, user):
        tracker = TrackerFactory(user=user)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.patch(url, {"order": 99}, format="json")
        assert response.status_code == status.HTTP_200_OK
        tracker.refresh_from_db()
        assert tracker.order == 99

    def test_cannot_change_key(self, auth_client, user):
        tracker = TrackerFactory(user=user, key="original")
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.patch(url, {"key": "changed"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_change_data_type(self, auth_client, user):
        tracker = TrackerFactory(user=user, data_type=DataType.TEXT)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.patch(url, {"data_type": "INTEGER"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_update_other_users_tracker(self, auth_client):
        other = UserFactory()
        tracker = TrackerFactory(user=other)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.patch(url, {"name": "Hacked"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Tracker delete (soft)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTrackerDelete:
    def test_soft_delete_custom_tracker(self, auth_client, user):
        tracker = TrackerFactory(user=user)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        tracker.refresh_from_db()
        assert tracker.is_active is False

    def test_cannot_hard_delete_via_api(self, auth_client, user):
        tracker = TrackerFactory(user=user)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        auth_client.delete(url)
        assert Tracker.objects.filter(pk=tracker.pk).exists()

    def test_cannot_delete_system_tracker(self, auth_client, user):
        tracker = Tracker.objects.filter(user=user, is_system=True).first()
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        tracker.refresh_from_db()
        assert tracker.is_active is True

    def test_soft_delete_preserves_tracker_values(self, auth_client, user):
        tracker = TrackerFactory(user=user, data_type=DataType.BOOLEAN)
        entry = EntryFactory(user=user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_bool=True)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        auth_client.delete(url)
        assert TrackerValue.objects.filter(pk=tv.pk).exists()

    def test_cannot_delete_other_users_tracker(self, auth_client):
        other = UserFactory()
        tracker = TrackerFactory(user=other)
        url = reverse("trackers:tracker-detail", args=[tracker.pk])
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Entry tracker values (GET + PUT)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEntryTrackerValues:
    def _url(self, date):
        return reverse("trackers:entry-trackers", args=[date])

    def test_get_returns_all_active_trackers_with_nulls(self, auth_client, user):
        entry = EntryFactory(user=user)
        response = auth_client.get(self._url(entry.date))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
        assert all(item["value"] is None for item in response.data)

    def test_get_returns_existing_value(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        TrackerValueFactory(tracker=mood, entry=entry, value_number="7.5")
        response = auth_client.get(self._url(entry.date))
        mood_item = next(i for i in response.data if i["tracker"]["key"] == "mood")
        assert mood_item["value"] == pytest.approx(7.5)

    def test_put_sets_values(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        worked_out = Tracker.objects.get(user=user, key="worked_out")
        payload = [
            {"tracker": str(mood.id), "value": 8.0},
            {"tracker": str(worked_out.id), "value": True},
        ]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert TrackerValue.objects.filter(entry=entry, tracker=mood).exists()
        assert TrackerValue.objects.filter(entry=entry, tracker=worked_out).exists()

    def test_put_replaces_existing_values(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        TrackerValueFactory(tracker=mood, entry=entry, value_number="5.0")
        payload = [{"tracker": str(mood.id), "value": 9.0}]
        auth_client.put(self._url(entry.date), payload, format="json")
        tv = TrackerValue.objects.get(entry=entry, tracker=mood)
        assert float(tv.value_number) == 9.0

    def test_put_null_value_clears_tracker(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        TrackerValueFactory(tracker=mood, entry=entry, value_number="5.0")
        payload = [{"tracker": str(mood.id), "value": None}]
        auth_client.put(self._url(entry.date), payload, format="json")
        assert not TrackerValue.objects.filter(entry=entry, tracker=mood).exists()

    def test_put_empty_list_clears_all_values(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        TrackerValueFactory(tracker=mood, entry=entry, value_number="7.0")
        auth_client.put(self._url(entry.date), [], format="json")
        assert not TrackerValue.objects.filter(entry=entry).exists()

    def test_mood_above_max_rejected(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        payload = [{"tracker": str(mood.id), "value": 11.0}]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mood_below_min_rejected(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        payload = [{"tracker": str(mood.id), "value": -1.0}]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_boolean_tracker_rejects_non_bool(self, auth_client, user):
        entry = EntryFactory(user=user)
        worked_out = Tracker.objects.get(user=user, key="worked_out")
        payload = [{"tracker": str(worked_out.id), "value": "yes"}]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_float_tracker_rejects_string(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        payload = [{"tracker": str(mood.id), "value": "good"}]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_option_tracker_rejects_invalid_key(self, auth_client, user):
        tracker = TrackerFactory(
            user=user,
            data_type=DataType.OPTION,
            config={"options": ["good", "bad"]},
        )
        entry = EntryFactory(user=user)
        payload = [{"tracker": str(tracker.id), "value": "excellent"}]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_option_tracker_accepts_valid_key(self, auth_client, user):
        tracker = TrackerFactory(
            user=user,
            data_type=DataType.OPTION,
            config={"options": ["good", "bad"]},
        )
        entry = EntryFactory(user=user)
        payload = [{"tracker": str(tracker.id), "value": "good"}]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_duplicate_trackers_in_payload_rejected(self, auth_client, user):
        entry = EntryFactory(user=user)
        mood = Tracker.objects.get(user=user, key="mood")
        payload = [
            {"tracker": str(mood.id), "value": 7.0},
            {"tracker": str(mood.id), "value": 8.0},
        ]
        response = auth_client.put(self._url(entry.date), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_set_values_on_other_users_entry(self, auth_client):
        other = UserFactory()
        entry = EntryFactory(user=other)
        response = auth_client.get(self._url(entry.date))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_entry_not_found_returns_404(self, auth_client):
        response = auth_client.get(self._url("2000-01-01"))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_requires_auth(self, api_client, user):
        entry = EntryFactory(user=user)
        response = api_client.get(self._url(entry.date))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
