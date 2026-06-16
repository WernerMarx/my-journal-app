from django.contrib import admin

from apps.trackers.models import Tracker, TrackerValue


@admin.register(Tracker)
class TrackerAdmin(admin.ModelAdmin):
    list_display = ["key", "name", "data_type", "is_system", "is_active", "order", "user"]
    list_filter = ["data_type", "is_system", "is_active"]
    search_fields = ["key", "name"]
    readonly_fields = ["is_system", "created_at", "updated_at"]
    ordering = ["user", "order"]


@admin.register(TrackerValue)
class TrackerValueAdmin(admin.ModelAdmin):
    list_display = ["tracker", "entry", "value_bool", "value_number", "created_at"]
    list_filter = ["tracker__data_type"]
    readonly_fields = ["created_at", "updated_at"]
    # value_text is intentionally excluded from list_display (may contain user content)
