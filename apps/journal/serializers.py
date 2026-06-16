"""Serializers for journal entries."""

from rest_framework import serializers

from apps.journal.models import Entry


class SearchResultSerializer(serializers.Serializer):
    """Read-only representation of a search result row.

    ``rank`` is None for browse-mode queries (no FTS), a float for FTS queries.
    ``snippet`` is the SearchHeadline excerpt (FTS) or the first 200 chars of body.
    """

    date = serializers.DateField()
    title = serializers.CharField()
    snippet = serializers.CharField()
    rank = serializers.FloatField(allow_null=True)


class EntrySerializer(serializers.ModelSerializer):
    """Read/write representation of an entry.

    ``user`` is never accepted from the client — the view assigns it from
    ``request.user``. One-entry-per-day is validated here for a clean 400 rather
    than surfacing the database IntegrityError as a 500.
    """

    class Meta:
        model = Entry
        fields = ["id", "date", "title", "body", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs: dict) -> dict:
        request = self.context["request"]
        # On create, date is in attrs; on partial update it falls back to the instance.
        date = attrs.get("date", getattr(self.instance, "date", None))
        if date is not None:
            clash = Entry.objects.filter(user=request.user, date=date)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError(
                    {"date": "An entry for this date already exists."}
                )
        return attrs
