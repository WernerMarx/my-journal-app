"""Attachment serializers."""

from django.conf import settings
from PIL import Image
from rest_framework import serializers

from apps.attachments.models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id",
            "media_type",
            "original_name",
            "size",
            "content_type",
            "width",
            "height",
            "file_url",
            "thumbnail_url",
            "is_processed",
            "created_at",
        ]
        read_only_fields = fields

    def get_file_url(self, obj: Attachment) -> str | None:
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_thumbnail_url(self, obj: Attachment) -> str | None:
        request = self.context.get("request")
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return None


class AttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(use_url=False)

    def validate_file(self, f):
        max_size = getattr(settings, "ATTACHMENT_MAX_UPLOAD_SIZE", 10 * 1024 * 1024)
        if f.size > max_size:
            max_mb = max_size // (1024 * 1024)
            raise serializers.ValidationError(
                f"File exceeds the {max_mb} MB limit." if max_mb else "File too large."
            )

        allowed = getattr(settings, "ATTACHMENT_ALLOWED_CONTENT_TYPES", [
            "image/jpeg", "image/png", "image/gif", "image/webp",
        ])
        if f.content_type not in allowed:
            raise serializers.ValidationError(
                "Unsupported file type. Only JPEG, PNG, GIF, and WebP images are accepted."
            )

        # Verify the bytes are actually a valid image, not just a spoofed MIME type.
        try:
            img = Image.open(f)
            img.verify()
        except Exception as exc:
            raise serializers.ValidationError("The uploaded file is not a valid image.") from exc
        finally:
            f.seek(0)

        return f
