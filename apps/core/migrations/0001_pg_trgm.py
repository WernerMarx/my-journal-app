"""Enable the pg_trgm Postgres extension.

Required for Phase 3 search: GIN trigram indexes on Entry.title and Entry.body
power substring/wildcard queries (*term*). Must run before any migration that
creates those indexes.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="DROP EXTENSION IF EXISTS pg_trgm;",
        ),
    ]
