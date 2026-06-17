"""Attachment model: images (Phase 4) attached to a journal entry."""

from pathlib import Path
from uuid import uuid4

from django.db import models

from apps.core.models import TimeStampedModel


def _attachment_path(instance, filename: str) -> str:
    """Store uploaded files under a UUID-derived path; original filename is not used."""
    ext = Path(filename).suffix.lower() or ".bin"
    return f"attachments/{uuid4().hex}{ext}"


def _thumbnail_path(instance, filename: str) -> str:
    return f"attachments/thumbs/{uuid4().hex}.jpg"


class MediaType(models.TextChoices):
    IMAGE = "IMAGE", "Image"
    VIDEO = "VIDEO", "Video"
    DOCUMENT = "DOCUMENT", "Document"


class Attachment(TimeStampedModel):
    """A file attached to a journal entry. Compression runs async via Celery."""

    entry = models.ForeignKey(
        "journal.Entry",
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to=_attachment_path)
    thumbnail = models.FileField(upload_to=_thumbnail_path, blank=True)
    media_type = models.CharField(
        max_length=20,
        choices=MediaType.choices,
        default=MediaType.IMAGE,
    )
    original_name = models.CharField(max_length=255)
    size = models.PositiveBigIntegerField(help_text="File size in bytes.")
    content_type = models.CharField(max_length=100)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    is_processed = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["entry"], name="attachment_entry_idx"),
        ]

    def __str__(self) -> str:
        # Never include original_name — content must not appear in logs.
        return f"Attachment({self.pk}, entry={self.entry_id})"
