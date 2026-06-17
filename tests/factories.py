"""factory-boy factories for the test suite."""

import io
from datetime import date, timedelta

import factory
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image as PILImage

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")

    @factory.post_generation
    def password(self, create: bool, extracted: str | None, **kwargs) -> None:
        password = extracted or "testpass123!"
        self.set_password(password)
        if create:
            self.save()


class EntryFactory(factory.django.DjangoModelFactory):
    # String model reference so importing this module does not require the
    # journal app to be importable yet (keeps red phases localized).
    class Meta:
        model = "journal.Entry"

    user = factory.SubFactory(UserFactory)
    date = factory.Sequence(lambda n: date(2026, 1, 1) + timedelta(days=n))
    title = factory.Faker("sentence", nb_words=4)
    body = factory.Faker("paragraph")


class TrackerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "trackers.Tracker"

    user = factory.SubFactory(UserFactory)
    key = factory.Sequence(lambda n: f"tracker_{n}")
    name = factory.Sequence(lambda n: f"Tracker {n}")
    data_type = "TEXT"
    config = factory.LazyFunction(dict)
    is_system = False
    is_active = True
    order = factory.Sequence(lambda n: n)


class TrackerValueFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "trackers.TrackerValue"

    entry = factory.SubFactory(EntryFactory)
    tracker = factory.SubFactory(TrackerFactory)
    value_text = None
    value_number = None
    value_bool = None


def _small_jpeg() -> bytes:
    buf = io.BytesIO()
    PILImage.new("RGB", (50, 50), color=(200, 100, 50)).save(buf, format="JPEG")
    return buf.getvalue()


class AttachmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "attachments.Attachment"

    entry = factory.SubFactory(EntryFactory)

    @factory.lazy_attribute
    def file(self):
        return SimpleUploadedFile("test.jpg", _small_jpeg(), content_type="image/jpeg")

    media_type = "IMAGE"
    original_name = "test.jpg"
    size = factory.LazyFunction(lambda: len(_small_jpeg()))
    content_type = "image/jpeg"
    is_processed = True
