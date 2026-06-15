"""Health-check endpoint."""

from django.urls import reverse


def test_health_returns_ok(api_client):
    url = reverse("core:health")
    response = api_client.get(url)

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_requires_no_auth(api_client):
    # No credentials set on the client; endpoint must still answer.
    response = api_client.get(reverse("core:health"))
    assert response.status_code == 200
