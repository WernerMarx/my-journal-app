"""Tests for attachment upload, list, and delete endpoints."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from tests.factories import EntryFactory, UserFactory

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _image_bytes(width: int = 100, height: int = 100, fmt: str = "JPEG") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(200, 100, 50)).save(buf, format=fmt)
    return buf.getvalue()


def _jpeg(name: str = "test.jpg", width: int = 100, height: int = 100) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _image_bytes(width, height), content_type="image/jpeg")


def _png(name: str = "test.png") -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new("RGB", (50, 50), color=(0, 200, 100)).save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


def _upload_url(date: str) -> str:
    return f"/api/v1/entries/{date}/attachments/"


# ---------------------------------------------------------------------------
# Upload (POST)
# ---------------------------------------------------------------------------


class TestUpload:
    def test_jpeg_accepted(self, auth_client, user):
        entry = EntryFactory(user=user)
        resp = auth_client.post(_upload_url(entry.date), data={"file": _jpeg()}, format="multipart")
        assert resp.status_code == 201
        data = resp.json()
        assert data["media_type"] == "IMAGE"
        assert data["content_type"] == "image/jpeg"
        assert data["original_name"] == "test.jpg"
        assert data["file_url"] is not None

    def test_png_accepted(self, auth_client, user):
        entry = EntryFactory(user=user)
        resp = auth_client.post(_upload_url(entry.date), data={"file": _png()}, format="multipart")
        assert resp.status_code == 201

    def test_oversized_rejected(self, auth_client, user, settings):
        entry = EntryFactory(user=user)
        settings.ATTACHMENT_MAX_UPLOAD_SIZE = 100  # bytes
        f = SimpleUploadedFile("big.jpg", b"x" * 200, content_type="image/jpeg")
        resp = auth_client.post(_upload_url(entry.date), data={"file": f}, format="multipart")
        assert resp.status_code == 400

    def test_wrong_mime_type_rejected(self, auth_client, user):
        entry = EntryFactory(user=user)
        f = SimpleUploadedFile("doc.pdf", b"PDF content", content_type="application/pdf")
        resp = auth_client.post(_upload_url(entry.date), data={"file": f}, format="multipart")
        assert resp.status_code == 400

    def test_invalid_image_bytes_rejected(self, auth_client, user):
        entry = EntryFactory(user=user)
        f = SimpleUploadedFile("fake.jpg", b"not an image", content_type="image/jpeg")
        resp = auth_client.post(_upload_url(entry.date), data={"file": f}, format="multipart")
        assert resp.status_code == 400

    def test_wrong_user_entry_returns_404(self, auth_client):
        other = UserFactory()
        other_entry = EntryFactory(user=other)
        resp = auth_client.post(
            _upload_url(other_entry.date), data={"file": _jpeg()}, format="multipart"
        )
        assert resp.status_code == 404

    def test_invalid_date_returns_404(self, auth_client):
        resp = auth_client.post(
            "/api/v1/entries/not-a-date/attachments/",
            data={"file": _jpeg()},
            format="multipart",
        )
        assert resp.status_code == 404

    def test_nonexistent_date_returns_404(self, auth_client):
        resp = auth_client.post(
            "/api/v1/entries/2020-01-01/attachments/",
            data={"file": _jpeg()},
            format="multipart",
        )
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, api_client, user):
        entry = EntryFactory(user=user)
        resp = api_client.post(_upload_url(entry.date), data={"file": _jpeg()}, format="multipart")
        assert resp.status_code == 401

    def test_error_response_does_not_contain_filename(self, auth_client, user):
        """File names must never appear in error responses (content logging rule)."""
        entry = EntryFactory(user=user)
        f = SimpleUploadedFile("my_secret.pdf", b"PDF", content_type="application/pdf")
        resp = auth_client.post(_upload_url(entry.date), data={"file": f}, format="multipart")
        assert resp.status_code == 400
        assert "my_secret" not in resp.text


# ---------------------------------------------------------------------------
# List (GET)
# ---------------------------------------------------------------------------


class TestList:
    def test_returns_own_attachments(self, auth_client, user):
        entry = EntryFactory(user=user)
        auth_client.post(_upload_url(entry.date), data={"file": _jpeg()}, format="multipart")
        auth_client.post(_upload_url(entry.date), data={"file": _png()}, format="multipart")

        resp = auth_client.get(_upload_url(entry.date))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_does_not_return_other_users_attachments(self, auth_client, user):
        other = UserFactory()
        other_entry = EntryFactory(user=other)
        resp = auth_client.get(_upload_url(other_entry.date))
        assert resp.status_code == 404

    def test_empty_list(self, auth_client, user):
        entry = EntryFactory(user=user)
        resp = auth_client.get(_upload_url(entry.date))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_unauthenticated_returns_401(self, api_client, user):
        entry = EntryFactory(user=user)
        resp = api_client.get(_upload_url(entry.date))
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Delete (DELETE)
# ---------------------------------------------------------------------------


class TestDelete:
    def test_delete_own_attachment(self, auth_client, user):
        entry = EntryFactory(user=user)
        create_resp = auth_client.post(
            _upload_url(entry.date), data={"file": _jpeg()}, format="multipart"
        )
        att_id = create_resp.json()["id"]

        del_resp = auth_client.delete(f"/api/v1/entries/{entry.date}/attachments/{att_id}/")
        assert del_resp.status_code == 204

        list_resp = auth_client.get(_upload_url(entry.date))
        assert list_resp.json() == []

    def test_cannot_delete_other_users_attachment(self, auth_client, user):
        from apps.attachments.models import Attachment

        other = UserFactory()
        other_entry = EntryFactory(user=other)
        att = Attachment.objects.create(
            entry=other_entry,
            file=SimpleUploadedFile("t.jpg", _image_bytes(), content_type="image/jpeg"),
            media_type="IMAGE",
            original_name="t.jpg",
            size=100,
            content_type="image/jpeg",
        )
        resp = auth_client.delete(f"/api/v1/entries/{other_entry.date}/attachments/{att.pk}/")
        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, api_client, user):
        entry = EntryFactory(user=user)
        resp = api_client.delete(f"/api/v1/entries/{entry.date}/attachments/999/")
        assert resp.status_code == 401
