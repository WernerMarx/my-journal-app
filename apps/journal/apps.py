from django.apps import AppConfig


class JournalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.journal"
    label = "journal"

    def ready(self) -> None:
        from django.db.models.signals import post_save

        from apps.journal.signals import update_search_vector

        post_save.connect(
            update_search_vector,
            sender="journal.Entry",
            dispatch_uid="journal.update_search_vector",
        )
