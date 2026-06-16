"""Unit tests for Tracker and TrackerValue models."""

import pytest
from django.db import IntegrityError

from apps.trackers.models import DataType, TrackerValue
from tests.factories import EntryFactory, TrackerFactory, TrackerValueFactory, UserFactory


@pytest.mark.django_db
class TestTrackerModel:
    def test_str(self):
        tracker = TrackerFactory(key="gratitude")
        assert str(tracker) == "gratitude"

    def test_unique_key_per_user(self):
        user = UserFactory()
        TrackerFactory(user=user, key="stress")
        with pytest.raises(IntegrityError):
            TrackerFactory(user=user, key="stress")

    def test_same_key_allowed_for_different_users(self):
        TrackerFactory(key="energy")
        TrackerFactory(key="energy")  # Different user via SubFactory

    def test_is_active_defaults_true(self):
        tracker = TrackerFactory()
        assert tracker.is_active is True

    def test_is_system_defaults_false(self):
        tracker = TrackerFactory()
        assert tracker.is_system is False

    def test_soft_delete_sets_is_active_false(self):
        tracker = TrackerFactory()
        tracker.is_active = False
        tracker.save(update_fields=["is_active"])
        tracker.refresh_from_db()
        assert tracker.is_active is False


@pytest.mark.django_db
class TestTrackerValueModel:
    def test_str(self):
        tracker = TrackerFactory(key="gratitude")
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_number=7)
        assert str(tv) == "gratitude"

    def test_value_property_boolean_true(self):
        tracker = TrackerFactory(data_type=DataType.BOOLEAN)
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_bool=True)
        assert tv.value is True

    def test_value_property_boolean_false(self):
        tracker = TrackerFactory(data_type=DataType.BOOLEAN)
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_bool=False)
        assert tv.value is False

    def test_value_property_float(self):
        tracker = TrackerFactory(data_type=DataType.FLOAT)
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_number="7.5")
        assert tv.value == pytest.approx(7.5)

    def test_value_property_integer(self):
        tracker = TrackerFactory(data_type=DataType.INTEGER)
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_number=5)
        assert tv.value == 5
        assert isinstance(tv.value, int)

    def test_value_property_text(self):
        tracker = TrackerFactory(data_type=DataType.TEXT)
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_text="Great day")
        assert tv.value == "Great day"

    def test_value_property_option(self):
        tracker = TrackerFactory(
            data_type=DataType.OPTION, config={"options": ["good", "bad"]}
        )
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_text="good")
        assert tv.value == "good"

    def test_value_property_none_when_unset(self):
        tracker = TrackerFactory(data_type=DataType.FLOAT)
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry)
        assert tv.value is None

    def test_unique_per_entry_and_tracker(self):
        tracker = TrackerFactory()
        entry = EntryFactory(user=tracker.user)
        TrackerValueFactory(tracker=tracker, entry=entry, value_bool=True)
        with pytest.raises(IntegrityError):
            TrackerValueFactory(tracker=tracker, entry=entry, value_bool=False)

    def test_deleting_entry_cascades_to_values(self):
        tracker = TrackerFactory(data_type=DataType.BOOLEAN)
        entry = EntryFactory(user=tracker.user)
        tv = TrackerValueFactory(tracker=tracker, entry=entry, value_bool=True)
        entry.delete()
        assert not TrackerValue.objects.filter(pk=tv.pk).exists()
