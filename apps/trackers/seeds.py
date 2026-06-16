"""Seed data for system trackers. Called on user creation and by management commands."""

from apps.trackers.models import DataType, Tracker

SYSTEM_TRACKERS: list[dict] = [
    {
        "key": "worked_out",
        "name": "Worked Out",
        "data_type": DataType.BOOLEAN,
        "config": {},
        "order": 0,
    },
    {
        "key": "mood",
        "name": "Mood",
        "data_type": DataType.FLOAT,
        "config": {"min": 0.0, "max": 10.0},
        "order": 1,
    },
    {
        "key": "diet",
        "name": "Diet",
        "data_type": DataType.FLOAT,
        "config": {"min": 0.0, "max": 10.0},
        "order": 2,
    },
]


def seed_system_trackers(user) -> None:
    """Idempotently ensure the three system trackers exist for ``user``."""
    for tracker_data in SYSTEM_TRACKERS:
        Tracker.objects.get_or_create(
            user=user,
            key=tracker_data["key"],
            defaults={
                "name": tracker_data["name"],
                "data_type": tracker_data["data_type"],
                "config": tracker_data["config"],
                "is_system": True,
                "is_active": True,
                "order": tracker_data["order"],
            },
        )
