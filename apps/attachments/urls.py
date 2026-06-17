from django.urls import path

from apps.attachments.views import AttachmentDestroyView, AttachmentListCreateView

app_name = "attachments"

urlpatterns = [
    path(
        "entries/<str:date>/attachments/",
        AttachmentListCreateView.as_view(),
        name="attachment-list",
    ),
    path(
        "entries/<str:date>/attachments/<int:pk>/",
        AttachmentDestroyView.as_view(),
        name="attachment-detail",
    ),
]
