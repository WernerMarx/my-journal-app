"""Journal entry API: CRUD scoped to the authenticated user, addressed by date."""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.journal.models import Entry
from apps.journal.serializers import EntrySerializer


class EntryViewSet(viewsets.ModelViewSet):
    """CRUD for the current user's entries.

    Entries are addressed by their journal ``date`` (e.g. /entries/2026-06-16/),
    not by a surrogate id. Every queryset is filtered to ``request.user`` so one
    user can never read or modify another's entries — a missing/foreign entry is
    a 404, never someone else's data.
    """

    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "date"
    lookup_value_regex = r"\d{4}-\d{2}-\d{2}"

    def get_queryset(self):
        return Entry.objects.filter(user=self.request.user)

    def perform_create(self, serializer: EntrySerializer) -> None:
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def today(self, request):
        """Return today's entry, or 404 if none has been written yet."""
        entry = self.get_queryset().filter(date=timezone.localdate()).first()
        if entry is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(self.get_serializer(entry).data)
