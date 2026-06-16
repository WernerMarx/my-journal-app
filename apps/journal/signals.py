"""Signal handlers for the journal app."""

from django.contrib.postgres.search import SearchVector


def update_search_vector(sender, instance, raw: bool = False, **kwargs) -> None:
    """Recompute the FTS search_vector after an Entry is saved.

    Uses a queryset UPDATE so Postgres evaluates SearchVector against the
    stored columns — avoids calling instance.save() (which would recurse).
    Skipped for raw=True loads (fixtures / loaddata).
    """
    if raw:
        return
    # Import here to avoid circular imports at module level.
    from apps.journal.models import Entry

    Entry.objects.filter(pk=instance.pk).update(
        search_vector=(
            SearchVector("title", weight="A", config="english")
            + SearchVector("body", weight="B", config="english")
        )
    )
