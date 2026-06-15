"""User-facing API views."""

from django.contrib.auth import get_user_model
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated

from apps.users.serializers import UserSerializer

User = get_user_model()


class MeView(RetrieveUpdateAPIView):
    """Retrieve or update the currently authenticated user (`/api/v1/users/me/`)."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self) -> User:
        return self.request.user
