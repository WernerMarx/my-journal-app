"""Tracker EAV models: definitions (Tracker) and per-entry values (TrackerValue).

A Tracker defines a typed field a user wants to record alongside each entry.
TrackerValue stores one value per (entry, tracker) pair. The three seeded system
trackers (worked_out, mood, diet) cannot be deleted; custom ones are soft-deleted
so historical values retain their meaning.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class DataType(models.TextChoices):
    TEXT = "TEXT", "Text"
    INTEGER = "INTEGER", "Integer"
    FLOAT = "FLOAT", "Float"
    BOOLEAN = "BOOLEAN", "Boolean"
    OPTION = "OPTION", "Option"


class Tracker(TimeStampedModel):
    """User-defined (or system-seeded) field definition."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trackers",
    )
    key = models.SlugField(max_length=50)
    name = models.CharField(max_length=100)
    data_type = models.CharField(max_length=20, choices=DataType.choices)
    config = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Type-specific config: {min, max} for numeric types; "
            "{options: [...]} for OPTION."
        ),
    )
    is_system = models.BooleanField(
        default=False,
        help_text="System trackers are seeded defaults and cannot be deleted.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-delete flag. Inactive trackers are hidden but values are kept.",
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "key"],
                name="unique_tracker_key_per_user",
            )
        ]

    def __str__(self) -> str:
        return self.key


class TrackerValue(TimeStampedModel):
    """One typed value for a (entry, tracker) pair."""

    entry = models.ForeignKey(
        "journal.Entry",
        on_delete=models.CASCADE,
        related_name="tracker_values",
    )
    tracker = models.ForeignKey(
        Tracker,
        on_delete=models.PROTECT,
        related_name="values",
    )
    value_text = models.TextField(blank=True, null=True)  # noqa: DJ001 — null distinguishes "not set" from ""
    value_number = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    value_bool = models.BooleanField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["entry", "tracker"],
                name="unique_value_per_entry_tracker",
            )
        ]

    @property
    def value(self) -> bool | int | float | str | None:
        dt = self.tracker.data_type
        if dt in (DataType.TEXT, DataType.OPTION):
            return self.value_text
        if dt == DataType.INTEGER:
            return int(self.value_number) if self.value_number is not None else None
        if dt == DataType.FLOAT:
            return float(self.value_number) if self.value_number is not None else None
        if dt == DataType.BOOLEAN:
            return self.value_bool
        return None

    def __str__(self) -> str:
        return self.tracker.key
