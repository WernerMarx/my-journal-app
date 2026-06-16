"""Signal handlers for the trackers app."""

from apps.trackers.seeds import seed_system_trackers


def on_user_created(sender, instance, created: bool, **kwargs) -> None:
    if created:
        seed_system_trackers(instance)
