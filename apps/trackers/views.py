"""Views for the trackers app."""

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.journal.models import Entry
from apps.trackers.models import Tracker, TrackerValue
from apps.trackers.serializers import (
    TrackerSerializer,
    TrackerValueInputSerializer,
    TrackerValueReadSerializer,
    value_to_fields,
)


class TrackerViewSet(viewsets.ModelViewSet):
    """CRUD for the authenticated user's tracker definitions.

    System trackers (is_system=True) cannot be deleted; the destroy action
    soft-deletes custom ones instead of hard-deleting. Key and data_type are
    immutable after creation — changing them would invalidate historical values.
    """

    serializer_class = TrackerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tracker.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer: TrackerSerializer) -> None:
        serializer.save(user=self.request.user)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        tracker = self.get_object()
        if tracker.is_system:
            return Response(
                {"detail": "System trackers cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )
        tracker.is_active = False
        tracker.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EntryTrackerValueView(APIView):
    """GET/PUT tracker values for a specific entry date.

    GET  — returns all active trackers for the user, each with its current
           value for this entry (null if not yet set).
    PUT  — replaces all tracker values for this entry. The body is a JSON
           array of {tracker: <uuid>, value: <typed>} objects. Null values
           and omitted trackers are cleared. Returns the same shape as GET.
    """

    permission_classes = [IsAuthenticated]

    def _get_entry(self, request: Request, date: str) -> Entry:
        return get_object_or_404(Entry, user=request.user, date=date)

    def _build_response(self, request: Request, entry: Entry) -> Response:
        trackers = Tracker.objects.filter(
            user=request.user, is_active=True
        ).order_by("order", "created_at")

        values_by_tracker = {
            tv.tracker_id: tv
            for tv in TrackerValue.objects.filter(entry=entry).select_related("tracker")
        }

        result = []
        for tracker in trackers:
            tv = values_by_tracker.get(tracker.pk)
            result.append({"tracker": tracker, "value": tv.value if tv else None})

        serializer = TrackerValueReadSerializer(result, many=True)
        return Response(serializer.data)

    def get(self, request: Request, date: str) -> Response:
        entry = self._get_entry(request, date)
        return self._build_response(request, entry)

    def put(self, request: Request, date: str) -> Response:
        entry = self._get_entry(request, date)

        if not isinstance(request.data, list):
            return Response(
                {"detail": "Expected a JSON array of tracker values."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TrackerValueInputSerializer(
            data=request.data,
            many=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            entry.tracker_values.all().delete()
            to_create = [
                TrackerValue(
                    entry=entry,
                    tracker=item["tracker"],
                    **value_to_fields(item["tracker"], item["value"]),
                )
                for item in serializer.validated_data
                if item["value"] is not None
            ]
            if to_create:
                TrackerValue.objects.bulk_create(to_create)

        return self._build_response(request, entry)
