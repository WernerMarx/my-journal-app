"""Journal entries: exactly one per user per calendar day.

The body is stored as searchable plaintext (see CLAUDE.md): confidentiality is
enforced at the perimeter, not by field-level encryption.  Phase 3 search uses:
  - search_vector (SearchVectorField + GIN) for ranked FTS and prefix queries
  - GIN pg_trgm indexes on title and body for *term* substring queries
"""

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models

from apps.core.models import TimeStampedModel


class Entry(TimeStampedModel):
    """A single day's journal entry, owned by a user and unique per (user, date)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    date = models.DateField(help_text="The calendar day this entry is for.")
    title = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    search_vector = SearchVectorField(
        null=True,
        blank=True,
        editable=False,
        help_text="Maintained by post_save signal; never set directly.",
    )

    class Meta:
        verbose_name = "entry"
        verbose_name_plural = "entries"
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_entry_per_user_per_day",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "-date"], name="entry_user_date_idx"),
            # FTS — for ranked / prefix search
            GinIndex(fields=["search_vector"], name="entry_search_vector_gin"),
            # Trigram — for *term* substring search (requires pg_trgm extension)
            GinIndex(fields=["title"], name="entry_title_trgm_gin", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["body"], name="entry_body_trgm_gin", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self) -> str:
        # Never include title/body — content must not leak into logs or admin lists.
        return f"Entry({self.date})"
