from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.journal.views import DashboardView, EntryViewSet, SearchView

app_name = "journal"

router = SimpleRouter()
router.register("entries", EntryViewSet, basename="entry")

urlpatterns = [
    path("", include(router.urls)),
    path("search/", SearchView.as_view(), name="search"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
]
