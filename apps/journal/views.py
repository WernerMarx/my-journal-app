"""Journal entry API: CRUD scoped to the authenticated user, addressed by date."""

import datetime

from django.utils import timezone
from rest_framework import generics, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.journal.models import Entry
from apps.journal.search import build_search_queryset
from apps.journal.serializers import EntrySerializer, SearchResultSerializer
from apps.trackers.models import TrackerValue


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


class DashboardView(APIView):
    """GET /dashboard/ — aggregated activity summary for the authenticated user.

    Returns:
      total_entries           — all-time entry count
      last_entry_date         — ISO date of the most-recent entry, or null
      current_month_entry_dates — ISO dates of entries in the current calendar month
      current_month_moods     — {ISO date: float} for entries with a mood value
                                this month; locates the mood tracker by its stable
                                key='mood', never by order or id
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()

        # Optional month navigation: ?year=2026&month=5
        try:
            year = int(request.query_params.get("year", today.year))
            month = int(request.query_params.get("month", today.month))
            if not (1 <= month <= 12) or year < 1:
                raise ValueError
            month_start = datetime.date(year, month, 1)
        except (ValueError, OverflowError):
            return Response(
                {"detail": "Invalid year or month parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # First day of the following month
        if month == 12:
            month_end = datetime.date(year + 1, 1, 1)
        else:
            month_end = datetime.date(year, month + 1, 1)

        entries_qs = Entry.objects.filter(user=user)

        total_entries = entries_qs.count()

        last = entries_qs.order_by("-date").values("date").first()
        last_entry_date = str(last["date"]) if last else None

        this_month_qs = entries_qs.filter(date__gte=month_start, date__lt=month_end)

        current_month_entry_dates = [
            str(d) for d in this_month_qs.order_by("date").values_list("date", flat=True)
        ]

        mood_rows = (
            TrackerValue.objects.filter(
                entry__user=user,
                entry__date__gte=month_start,
                entry__date__lt=month_end,
                tracker__key="mood",
                tracker__user=user,
                value_number__isnull=False,
            )
            .select_related("entry")
            .values("entry__date", "value_number")
        )
        current_month_moods = {
            str(row["entry__date"]): float(row["value_number"]) for row in mood_rows
        }

        return Response(
            {
                "total_entries": total_entries,
                "last_entry_date": last_entry_date,
                "current_month_entry_dates": current_month_entry_dates,
                "current_month_moods": current_month_moods,
            }
        )


class SearchView(generics.ListAPIView):
    """GET /search/?q=...&date_from=&date_to=&sort=

    Supports wildcard syntax (see search.py). Results are always scoped to the
    authenticated user. Journal content is never logged — the q param is not
    written to any log or error response.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = SearchResultSerializer

    def get_queryset(self):
        params = self.request.query_params
        q = params.get("q", "")
        sort = params.get("sort", "relevance")
        date_from = params.get("date_from", "")
        date_to = params.get("date_to", "")

        errors = {}
        if date_from:
            try:
                datetime.date.fromisoformat(date_from)
            except ValueError:
                errors["date_from"] = "Enter a valid date (YYYY-MM-DD)."
        if date_to:
            try:
                datetime.date.fromisoformat(date_to)
            except ValueError:
                errors["date_to"] = "Enter a valid date (YYYY-MM-DD)."
        if errors:
            raise serializers.ValidationError(errors)

        qs = Entry.objects.filter(user=self.request.user)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return build_search_queryset(qs, q, sort=sort)
