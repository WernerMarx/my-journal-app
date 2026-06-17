"""Attachment views: list/upload/delete per entry-date."""

import datetime

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.attachments.models import Attachment, MediaType
from apps.attachments.serializers import AttachmentSerializer, AttachmentUploadSerializer
from apps.attachments.tasks import compress_image
from apps.journal.models import Entry


def _get_entry_or_404(user, date_str: str) -> Entry:
    """Return the entry for *user* on *date_str*, or raise 404."""
    try:
        datetime.date.fromisoformat(date_str)
    except ValueError as exc:
        raise NotFound() from exc
    return get_object_or_404(Entry, user=user, date=date_str)


class AttachmentListCreateView(APIView):
    """GET /entries/{date}/attachments/  — list
    POST /entries/{date}/attachments/  — upload (multipart/form-data)
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, date: str):
        entry = _get_entry_or_404(request.user, date)
        qs = Attachment.objects.filter(entry=entry)
        serializer = AttachmentSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request, date: str):
        entry = _get_entry_or_404(request.user, date)

        upload = AttachmentUploadSerializer(data=request.data, context={"request": request})
        upload.is_valid(raise_exception=True)
        f = upload.validated_data["file"]

        attachment = Attachment.objects.create(
            entry=entry,
            file=f,
            media_type=MediaType.IMAGE,
            original_name=f.name,
            size=f.size,
            content_type=f.content_type,
        )

        compress_image.delay(attachment.pk)

        # Refresh so the response reflects any eager-mode task changes.
        attachment.refresh_from_db()
        serializer = AttachmentSerializer(attachment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttachmentDestroyView(APIView):
    """DELETE /entries/{date}/attachments/{pk}/"""

    permission_classes = [IsAuthenticated]

    def delete(self, request, date: str, pk: int):
        _get_entry_or_404(request.user, date)  # ensures the entry belongs to this user
        attachment = get_object_or_404(Attachment, pk=pk, entry__user=request.user)

        if attachment.file:
            attachment.file.delete(save=False)
        if attachment.thumbnail:
            attachment.thumbnail.delete(save=False)
        attachment.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
