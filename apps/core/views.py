"""Operational endpoints that aren't tied to a business domain."""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """Liveness probe. Returns 200 with a small JSON payload; no auth required."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @extend_schema(
        summary="Health check",
        description="Returns 200 when the service is up. Used by load balancers and orchestrators.",
        responses={200: {"type": "object", "properties": {"status": {"type": "string"}}}},
    )
    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})
