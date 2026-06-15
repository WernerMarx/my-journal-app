"""User model + manager behaviour."""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

pytestmark = pytest.mark.django_db


def test_create_user_with_email():
    user = User.objects.create_user(email="person@example.com", password="pw12345!")

    assert user.email == "person@example.com"
    assert user.check_password("pw12345!")
    assert user.is_active
    assert not user.is_staff
    assert not user.is_superuser


def test_create_user_normalizes_email_domain():
    user = User.objects.create_user(email="Person@EXAMPLE.COM", password="pw12345!")
    # normalize_email lowercases the domain part.
    assert user.email == "Person@example.com"


def test_create_user_without_email_raises():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="pw12345!")


def test_create_superuser_flags():
    admin = User.objects.create_superuser(email="root@example.com", password="pw12345!")

    assert admin.is_staff
    assert admin.is_superuser


def test_create_superuser_requires_is_superuser_true():
    with pytest.raises(ValueError):
        User.objects.create_superuser(
            email="root@example.com", password="pw12345!", is_superuser=False
        )


def test_str_is_email():
    user = User.objects.create_user(email="who@example.com", password="pw12345!")
    assert str(user) == "who@example.com"


def test_user_has_no_username_field():
    field_names = {f.name for f in User._meta.get_fields()}
    assert "username" not in field_names
