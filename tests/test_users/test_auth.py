"""Authentication flows: registration, JWT cookie-mode login/refresh/logout,
current-user endpoint, and the production rule that mandatory email verification
withholds tokens.

Token transport contract (see CLAUDE.md):
  - Access token  → response body only, kept in JS memory by the client.
  - Refresh token → HttpOnly, Secure, SameSite=Strict cookie named 'refresh'.
  - No access-token cookie.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()

pytestmark = pytest.mark.django_db

STRONG_PASSWORD = "Str0ngPass!23"
LOGIN_URL = "rest_login"
LOGOUT_URL = "rest_logout"
REFRESH_URL = "token_refresh"
REGISTER_URL = "rest_register"
ME_URL = "users:me"


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def test_register_issues_access_token(api_client, settings):
    """Registration issues an access token when email verification is optional.

    Note: dj-rest-auth's registration view does not set the HttpOnly refresh
    cookie — it returns both tokens in the response body. This is acceptable
    because registration is disabled in production (accounts are provisioned
    via management command). The HttpOnly cookie contract applies to login /
    refresh / logout only.
    """
    settings.ACCOUNT_EMAIL_VERIFICATION = "optional"
    response = api_client.post(
        reverse(REGISTER_URL),
        {"email": "new@example.com", "password1": STRONG_PASSWORD, "password2": STRONG_PASSWORD},
        format="json",
    )

    assert response.status_code == 201
    assert "access" in response.data
    assert User.objects.filter(email="new@example.com").exists()


def test_register_withholds_all_tokens_when_verification_mandatory(api_client, settings):
    settings.ACCOUNT_EMAIL_VERIFICATION = "mandatory"
    response = api_client.post(
        reverse(REGISTER_URL),
        {
            "email": "verify@example.com",
            "password1": STRONG_PASSWORD,
            "password2": STRONG_PASSWORD,
        },
        format="json",
    )

    assert response.status_code == 201
    # No tokens issued until the address is verified and the user logs in.
    assert "access" not in response.data
    assert User.objects.filter(email="verify@example.com").exists()


def test_password_mismatch_is_rejected(api_client):
    response = api_client.post(
        reverse(REGISTER_URL),
        {"email": "bad@example.com", "password1": STRONG_PASSWORD, "password2": "different!9"},
        format="json",
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


def test_login_returns_access_in_body_and_refresh_in_cookie(api_client, user):
    response = api_client.post(
        reverse(LOGIN_URL),
        {"email": "user@example.com", "password": "testpass123!"},
        format="json",
    )

    assert response.status_code == 200
    # Access token in the body — JS stores it in memory and sends as Bearer.
    assert "access" in response.data
    # dj-rest-auth sets refresh="" in the body when JWT_AUTH_HTTPONLY=True;
    # the actual token lives only in the HttpOnly cookie.
    assert not response.data.get("refresh")
    # Refresh cookie must be present and HttpOnly.
    assert "refresh" in response.cookies
    assert response.cookies["refresh"]["httponly"]


def test_login_with_wrong_password_fails(api_client, user):
    response = api_client.post(
        reverse(LOGIN_URL),
        {"email": "user@example.com", "password": "wrong-password"},
        format="json",
    )
    assert response.status_code == 400


def test_existing_django_session_does_not_force_csrf_on_api(user):
    """Regression: a Django admin session in the same browser must NOT make the
    JWT API enforce CSRF on login. The API is stateless (JWT/Bearer only, no
    SessionAuthentication), so a stray session cookie is simply ignored."""
    from rest_framework.test import APIClient

    client = APIClient(enforce_csrf_checks=True)
    client.force_login(user)  # mimics being logged into /admin/ in the same browser

    response = client.post(
        reverse(LOGIN_URL),
        {"email": "user@example.com", "password": "testpass123!"},
        format="json",
    )

    assert response.status_code == 200
    assert "access" in response.data


# ---------------------------------------------------------------------------
# Token refresh (cookie-based)
# ---------------------------------------------------------------------------


def test_refresh_via_cookie_returns_new_access_token(api_client, user):
    """Refresh endpoint reads the HttpOnly cookie; no body token needed."""
    login = api_client.post(
        reverse(LOGIN_URL),
        {"email": "user@example.com", "password": "testpass123!"},
        format="json",
    )
    assert login.status_code == 200
    assert "refresh" in login.cookies  # sanity-check the cookie was set

    # The test client carries cookies between requests automatically.
    refreshed = api_client.post(reverse(REFRESH_URL), format="json")

    assert refreshed.status_code == 200
    assert "access" in refreshed.data
    # A new refresh cookie should replace the old one (rotation).
    assert "refresh" in refreshed.cookies


# ---------------------------------------------------------------------------
# Logout (blacklisting)
# ---------------------------------------------------------------------------


def test_logout_blacklists_refresh_token(api_client, user):
    """Logging out must invalidate the refresh token so it cannot be reused."""
    login = api_client.post(
        reverse(LOGIN_URL),
        {"email": "user@example.com", "password": "testpass123!"},
        format="json",
    )
    assert login.status_code == 200
    access = login.data["access"]

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    logout = api_client.post(reverse(LOGOUT_URL), format="json")
    assert logout.status_code == 200

    # The refresh cookie is now blacklisted; a refresh attempt must fail.
    api_client.credentials()  # clear Bearer header
    refreshed = api_client.post(reverse(REFRESH_URL), format="json")
    assert refreshed.status_code in (400, 401)


# ---------------------------------------------------------------------------
# Unauthenticated access is rejected
# ---------------------------------------------------------------------------


def test_me_requires_authentication(api_client):
    response = api_client.get(reverse(ME_URL))
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# /users/me/ — retrieval and update
# ---------------------------------------------------------------------------


def test_me_returns_current_user(auth_client, user):
    response = auth_client.get(reverse(ME_URL))

    assert response.status_code == 200
    assert response.data["email"] == user.email
    assert "id" in response.data


def test_me_can_update_names(auth_client, user):
    response = auth_client.patch(
        reverse(ME_URL),
        {"first_name": "Ada", "last_name": "Lovelace"},
        format="json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Ada"
    assert user.full_name == "Ada Lovelace"
