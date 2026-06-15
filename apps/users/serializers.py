"""User + registration serializers. Registration is email-only (no username)."""

from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Public representation of a user (used by dj-rest-auth's user-details and /users/me/)."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "date_joined"]
        read_only_fields = ["id", "email", "date_joined"]


class RegisterSerializer(BaseRegisterSerializer):
    """Email + password registration. Drops dj-rest-auth's default username field."""

    username = None  # remove the inherited username field entirely
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    def get_cleaned_data(self) -> dict:
        data = super().get_cleaned_data()
        data["first_name"] = self.validated_data.get("first_name", "")
        data["last_name"] = self.validated_data.get("last_name", "")
        return data
