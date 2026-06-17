"""Celery tasks for attachment post-processing."""

import io
import logging

from celery import shared_task
from PIL import Image

logger = logging.getLogger(__name__)

_MAX_DIMENSION = 1920
_THUMB_SIZE = (300, 300)
_COMPRESS_QUALITY = 85
_THUMB_QUALITY = 80


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def compress_image(self, attachment_id: int) -> None:
    """Compress the uploaded image in-place and generate a thumbnail.

    Safe to re-run: returns immediately if already processed.
    Never logs file names or journal content.
    """
    from django.core.files.base import ContentFile

    from apps.attachments.models import Attachment

    try:
        attachment = Attachment.objects.select_related("entry").get(pk=attachment_id)
    except Attachment.DoesNotExist:
        return

    if attachment.is_processed:
        return

    try:
        with attachment.file.open("rb") as f:
            img = Image.open(f)
            img.load()

        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        if max(img.width, img.height) > _MAX_DIMENSION:
            img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION), Image.LANCZOS)

        width, height = img.width, img.height

        # Overwrite original with compressed JPEG.
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=_COMPRESS_QUALITY, optimize=True)
        buf.seek(0)
        with attachment.file.open("wb") as f:
            f.write(buf.read())

        # Generate thumbnail.
        img.thumbnail(_THUMB_SIZE, Image.LANCZOS)
        thumb_buf = io.BytesIO()
        img.save(thumb_buf, format="JPEG", quality=_THUMB_QUALITY, optimize=True)
        attachment.thumbnail.save("thumb.jpg", ContentFile(thumb_buf.getvalue()), save=False)

        attachment.width = width
        attachment.height = height
        attachment.size = attachment.file.size
        attachment.is_processed = True
        attachment.save(update_fields=["thumbnail", "width", "height", "size", "is_processed"])

    except Exception as exc:
        logger.error("compress_image failed for attachment pk=%s", attachment_id)
        raise self.retry(exc=exc) from exc
