import uuid

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MeasurementImportRun",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("source_name", models.CharField(max_length=128)),
                ("dataset_path", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("running", "Running"), ("success", "Success"), ("failed", "Failed")],
                        default="running",
                        max_length=16,
                    ),
                ),
                ("files_seen", models.PositiveIntegerField(default=0)),
                ("measurements_created", models.PositiveIntegerField(default=0)),
                ("measurements_updated", models.PositiveIntegerField(default=0)),
                ("measurements_skipped", models.PositiveIntegerField(default=0)),
                ("error_log", models.TextField(blank=True)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "db_table": "measurement_import_runs",
                "ordering": ["-started_at"],
            },
        ),
        migrations.CreateModel(
            name="WaterMeasurement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("manual", "Manual"),
                            ("lab_equipment", "Lab equipment"),
                            ("gemstat", "GemStat"),
                            ("csv_import", "CSV import"),
                        ],
                        max_length=32,
                    ),
                ),
                ("temperature", models.FloatField(blank=True, null=True)),
                ("ph", models.FloatField(blank=True, null=True)),
                ("parameters_data", models.JSONField(blank=True, default=dict)),
                ("sample_location", models.JSONField(blank=True, default=dict)),
                ("raw_import_data", models.JSONField(blank=True, default=dict)),
                ("source_dataset", models.CharField(blank=True, max_length=128)),
                ("external_station_id", models.CharField(blank=True, max_length=64)),
                ("sample_date", models.DateField(blank=True, null=True)),
                ("sample_time", models.TimeField(blank=True, null=True)),
                ("depth", models.FloatField(blank=True, null=True)),
                ("source_key", models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ("import_hash", models.CharField(blank=True, max_length=64)),
                ("is_public", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.CASCADE,
                        related_name="water_measurements",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "water_measurements",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="watermeasurement",
            index=models.Index(fields=["owner", "created_at"], name="water_measu_owner_i_999559_idx"),
        ),
        migrations.AddIndex(
            model_name="watermeasurement",
            index=models.Index(fields=["source", "created_at"], name="water_measu_source__1779aa_idx"),
        ),
        migrations.AddIndex(
            model_name="watermeasurement",
            index=models.Index(fields=["is_public"], name="water_measu_is_publ_90d704_idx"),
        ),
        migrations.AddIndex(
            model_name="watermeasurement",
            index=models.Index(
                fields=["external_station_id", "sample_date"],
                name="water_measu_externa_93f1f5_idx",
            ),
        ),
    ]
