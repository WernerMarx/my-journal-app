from django.contrib import admin

from apps.journal.models import Entry


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    """Minimal admin. Entry content (title/body) is deliberately kept out of list
    views and filters so it does not leak into admin screens; the change form is
    available for the owner when needed."""

    list_display = ["date", "user", "updated_at"]
    list_filter = ["user", "date"]
    ordering = ["-date"]
    readonly_fields = ["created_at", "updated_at"]
