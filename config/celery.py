"""Celery application. Tasks are auto-discovered from each installed app's tasks.py."""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("development_template")

# Pull CELERY_* settings from Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Discover tasks.py modules across INSTALLED_APPS.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self) -> None:
    print(f"Request: {self.request!r}")
