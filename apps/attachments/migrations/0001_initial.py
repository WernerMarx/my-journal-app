import apps.attachments.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("journal", "0002_entry_search_vector_entry_entry_search_vector_gin_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Attachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("file", models.FileField(upload_to=apps.attachments.models._attachment_path)),
                ("thumbnail", models.FileField(blank=True, upload_to=apps.attachments.models._thumbnail_path)),
                ("media_type", models.CharField(
                    choices=[("IMAGE", "Image"), ("VIDEO", "Video"), ("DOCUMENT", "Document")],
                    default="IMAGE",
                    max_length=20,
                )),
                ("original_name", models.CharField(max_length=255)),
                ("size", models.PositiveBigIntegerField(help_text="File size in bytes.")),
                ("content_type", models.CharField(max_length=100)),
                ("width", models.PositiveIntegerField(blank=True, null=True)),
                ("height", models.PositiveIntegerField(blank=True, null=True)),
                ("is_processed", models.BooleanField(default=False)),
                ("entry", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="attachments",
                    to="journal.entry",
                )),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="attachment",
            index=models.Index(fields=["entry"], name="attachment_entry_idx"),
        ),
    ]
