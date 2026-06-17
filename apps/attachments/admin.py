from django.contrib import admin

from apps.attachments.models import Attachment


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["pk", "entry_id", "media_type", "content_type", "size", "is_processed", "created_at"]
    list_filter = ["media_type", "is_processed"]
    readonly_fields = ["created_at", "updated_at"]
    # Never display original_name in list to avoid surfacing content in admin logs.
