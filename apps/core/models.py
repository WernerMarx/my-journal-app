"""Shared abstract base models. Concrete apps inherit these; core itself ships no tables."""

import uuid

from django.db import models


class TimeStampedModel(models.Model):
    """Adds self-managing ``created_at`` / ``updated_at`` timestamps."""

    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, editable=False)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class UUIDModel(models.Model):
    """Uses a non-sequential UUID primary key instead of an auto-incrementing int."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """Convenience combination of UUID PK + timestamps."""

    class Meta:
        abstract = True
        ordering = ["-created_at"]
