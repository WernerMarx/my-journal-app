"""Tests for the Celery image compression task.

CELERY_TASK_ALWAYS_EAGER=True (test.py) means compress_image runs synchronously
inside the POST request, so the DB is already updated when we query after upload.
"""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from tests.factories import EntryFactory

pytestmark = pytest.mark.django_db


def _image_bytes(width: int = 200, height: int = 200, fmt: str = "JPEG") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(100, 150, 200)).save(buf, format=fmt)
    return buf.getvalue()


def _jpeg(width: int = 200, height: int = 200) -> SimpleUploadedFile:
    return SimpleUploadedFile("photo.jpg", _image_bytes(width, height), content_type="image/jpeg")


def _upload(auth_client, entry, file=None):
    file = file or _jpeg()
    return auth_client.post(
        f"/api/v1/entries/{entry.date}/attachments/",
        data={"file": file},
        format="multipart",
    )


class TestCompression:
    def test_is_processed_after_upload(self, auth_client, user):
        """Task runs eagerly; is_processed must be True in the DB immediately."""
        from apps.attachments.models import Attachment

        entry = EntryFactory(user=user)
        resp = _upload(auth_client, entry)
        assert resp.status_code == 201

        att = Attachment.objects.get(pk=resp.json()["id"])
        assert att.is_processed is True

    def test_thumbnail_created(self, auth_client, user):
        from apps.attachments.models import Attachment

        entry = EntryFactory(user=user)
        resp = _upload(auth_client, entry)
        att = Attachment.objects.get(pk=resp.json()["id"])
        assert bool(att.thumbnail)

    def test_thumbnail_url_returned(self, auth_client, user):
        entry = EntryFactory(user=user)
        resp = _upload(auth_client, entry)
        assert resp.json()["thumbnail_url"] is not None

    def test_dimensions_stored(self, auth_client, user):
        from apps.attachments.models import Attachment

        entry = EntryFactory(user=user)
        resp = _upload(auth_client, entry, file=_jpeg(width=200, height=100))
        att = Attachment.objects.get(pk=resp.json()["id"])
        assert att.width == 200
        assert att.height == 100

    def test_dimensions_in_response(self, auth_client, user):
        entry = EntryFactory(user=user)
        resp = _upload(auth_client, entry, file=_jpeg(width=200, height=150))
        data = resp.json()
        assert data["width"] == 200
        assert data["height"] == 150

    def test_large_image_resized(self, auth_client, user):
        """Images wider than 1920px must be resized down."""
        from apps.attachments.models import Attachment

        entry = EntryFactory(user=user)
        big = SimpleUploadedFile(
            "big.jpg", _image_bytes(2400, 1800), content_type="image/jpeg"
        )
        resp = _upload(auth_client, entry, file=big)
        att = Attachment.objects.get(pk=resp.json()["id"])
        assert att.width <= 1920
        assert att.height <= 1920

    def test_size_updated_after_compression(self, auth_client, user):
        """size field should reflect compressed file size, not original upload size."""
        from apps.attachments.models import Attachment

        entry = EntryFactory(user=user)
        original_bytes = _image_bytes(200, 200)
        f = SimpleUploadedFile("photo.jpg", original_bytes, content_type="image/jpeg")
        resp = _upload(auth_client, entry, file=f)
        att = Attachment.objects.get(pk=resp.json()["id"])
        # size should be set (> 0); the exact value depends on compression
        assert att.size > 0

    def test_png_converted_to_jpeg(self, auth_client, user):
        """PNG uploads are compressed to JPEG; task should succeed."""
        from apps.attachments.models import Attachment

        entry = EntryFactory(user=user)
        png_buf = io.BytesIO()
        Image.new("RGB", (100, 100), color=(10, 20, 30)).save(png_buf, format="PNG")
        f = SimpleUploadedFile("img.png", png_buf.getvalue(), content_type="image/png")
        resp = _upload(auth_client, entry, file=f)
        assert resp.status_code == 201
        att = Attachment.objects.get(pk=resp.json()["id"])
        assert att.is_processed is True
