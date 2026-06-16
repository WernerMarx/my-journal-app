from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.journal.views import EntryViewSet

app_name = "journal"

router = SimpleRouter()
router.register("entries", EntryViewSet, basename="entry")

urlpatterns = [
    path("", include(router.urls)),
]
