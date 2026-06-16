from django.apps import AppConfig


class TrackersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.trackers"
    label = "trackers"

    def ready(self) -> None:
        from django.contrib.auth import get_user_model
        from django.db.models.signals import post_save

        from apps.trackers.signals import on_user_created

        post_save.connect(
            on_user_created,
            sender=get_user_model(),
            dispatch_uid="trackers.seed_system_trackers_on_user_create",
        )
