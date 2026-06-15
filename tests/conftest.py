"""Shared pytest fixtures."""

import pytest
from rest_framework.test import APIClient

from tests.factories import UserFactory


@pytest.fixture
def api_client() -> APIClient:
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def user(db):
    """A persisted regular user with a known password."""
    return UserFactory(email="user@example.com", password="testpass123!")


@pytest.fixture
def superuser(db):
    """A persisted superuser."""
    return UserFactory(
        email="admin@example.com",
        password="adminpass123!",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def auth_client(api_client: APIClient, user) -> APIClient:
    """API client authenticated as ``user`` via a SimpleJWT access token."""
    from rest_framework_simplejwt.tokens import RefreshToken

    access = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return api_client
