"""Journal entries: exactly one per user per calendar day.

The body is stored as searchable plaintext (see CLAUDE.md): confidentiality is
enforced at the perimeter, not by field-level encryption, so that Phase 3 search
(pg_trgm / full-text) can operate on it. A SearchVectorField + GIN indexes are
added in Phase 3; this model intentionally stays minimal for now.
"""

from django.conf import settings
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
        ]

    def __str__(self) -> str:
        # Never include title/body here — entry content must not leak into logs,
        # admin lists, or error output.
        return f"Entry({self.date})"
