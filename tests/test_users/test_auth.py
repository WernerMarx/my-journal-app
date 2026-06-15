"""Authentication flows: registration, JWT login/refresh, current-user, and the
production rule that mandatory email verification withholds tokens."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()

pytestmark = pytest.mark.django_db

STRONG_PASSWORD = "Str0ngPass!23"


def test_register_issues_jwt_when_verification_optional(api_client, settings):
    settings.ACCOUNT_EMAIL_VERIFICATION = "optional"
    response = api_client.post(
        reverse("rest_register"),
        {"email": "new@example.com", "password1": STRONG_PASSWORD, "password2": STRONG_PASSWORD},
        format="json",
    )

    assert response.status_code == 201
    assert "access" in response.data
    assert "refresh" in response.data
    assert User.objects.filter(email="new@example.com").exists()


def test_register_withholds_jwt_when_verification_mandatory(api_client, settings):
    settings.ACCOUNT_EMAIL_VERIFICATION = "mandatory"
    response = api_client.post(
        reverse("rest_register"),
        {"email": "verify@example.com", "password1": STRONG_PASSWORD, "password2": STRONG_PASSWORD},
        format="json",
    )

    assert response.status_code == 201
    # No tokens until the address is verified and the user logs in.
    assert "access" not in response.data
    assert "refresh" not in response.data
    assert User.objects.filter(email="verify@example.com").exists()


def test_password_mismatch_is_rejected(api_client):
    response = api_client.post(
        reverse("rest_register"),
        {"email": "bad@example.com", "password1": STRONG_PASSWORD, "password2": "different!9"},
        format="json",
    )
    assert response.status_code == 400


def test_login_returns_jwt_and_refresh_works(api_client, user):
    login = api_client.post(
        reverse("rest_login"),
        {"email": "user@example.com", "password": "testpass123!"},
        format="json",
    )
    assert login.status_code == 200
    assert "access" in login.data
    refresh_token = login.data["refresh"]

    refreshed = api_client.post(reverse("token_refresh"), {"refresh": refresh_token}, format="json")
    assert refreshed.status_code == 200
    assert "access" in refreshed.data


def test_login_with_wrong_password_fails(api_client, user):
    response = api_client.post(
        reverse("rest_login"),
        {"email": "user@example.com", "password": "wrong-password"},
        format="json",
    )
    assert response.status_code == 400


def test_me_requires_authentication(api_client):
    response = api_client.get(reverse("users:me"))
    assert response.status_code == 401


def test_me_returns_current_user(auth_client, user):
    response = auth_client.get(reverse("users:me"))

    assert response.status_code == 200
    assert response.data["email"] == user.email
    assert "id" in response.data


def test_me_can_update_names(auth_client, user):
    response = auth_client.patch(
        reverse("users:me"), {"first_name": "Ada", "last_name": "Lovelace"}, format="json"
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Ada"
    assert user.full_name == "Ada Lovelace"
