from django.urls import include, path, re_path
from rest_framework.routers import SimpleRouter

from apps.trackers.views import EntryTrackerValueView, TrackerViewSet

app_name = "trackers"

router = SimpleRouter()
router.register("trackers", TrackerViewSet, basename="tracker")

urlpatterns = [
    path("", include(router.urls)),
    re_path(
        r"^entries/(?P<date>\d{4}-\d{2}-\d{2})/trackers/$",
        EntryTrackerValueView.as_view(),
        name="entry-trackers",
    ),
]
