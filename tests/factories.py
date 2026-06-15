"""factory-boy factories for the test suite."""

import factory
from django.contrib.auth import get_user_model

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
