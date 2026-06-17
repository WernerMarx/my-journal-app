"""Root URL configuration.

API is versioned under /api/v1/. Auth flows are provided by dj-rest-auth
(SimpleJWT) and dj-rest-auth.registration (allauth-backed). Schema/docs via
drf-spectacular.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# API is mounted under the /api/v1/ path prefix. dj-rest-auth / allauth url names
# (e.g. "account_confirm_email") must stay un-namespaced because allauth reverses
# them without a namespace, so we mount each include directly rather than wrapping
# them in a single instance namespace. The per-app namespaces (core:, users:) remain.
urlpatterns = [
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/", include("apps.core.urls")),  # core:health
    path("api/v1/auth/", include("dj_rest_auth.urls")),  # login/logout/password/token refresh
    path(
        "api/v1/auth/registration/", include("dj_rest_auth.registration.urls")
    ),  # register/verify-email
    path("api/v1/users/", include("apps.users.urls")),  # users:me
    path("api/v1/", include("apps.journal.urls")),  # journal:entry-*
    path("api/v1/", include("apps.trackers.urls")),  # trackers:tracker-* + entry-trackers
    path("api/v1/", include("apps.attachments.urls")),  # attachments:attachment-*
    # OpenAPI schema + docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    import debug_toolbar

    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
