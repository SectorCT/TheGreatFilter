import uuid

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("measurements", "0001_initial"),
        ("studies", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="GeneratedFilter",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("Pending", "Pending"),
                            ("Generating", "Generating"),
                            ("Success", "Success"),
                            ("Failed", "Failed"),
                        ],
                        default="Pending",
                        max_length=16,
                    ),
                ),
                ("internal_status", models.CharField(blank=True, max_length=64)),
                ("progress_percent", models.PositiveSmallIntegerField(default=0)),
                ("current_step", models.CharField(blank=True, max_length=255)),
                ("filter_structure", models.JSONField(blank=True, default=dict)),
                ("experiment_payload", models.JSONField(blank=True, default=dict)),
                ("result_payload", models.JSONField(blank=True, default=dict)),
                ("summary_metrics", models.JSONField(blank=True, default=dict)),
                ("export_payload", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True)),
                ("celery_task_id", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                (
                    "measurement",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="generated_filters",
                        to="measurements.watermeasurement",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="generated_filters", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "study",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="filters", to="studies.study"),
                ),
            ],
            options={
                "db_table": "generated_filters",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="FilterEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(max_length=16)),
                ("message", models.CharField(max_length=255)),
                ("extra", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "filter",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="events", to="filters.generatedfilter"),
                ),
            ],
            options={
                "db_table": "filter_events",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="generatedfilter",
            index=models.Index(fields=["owner", "created_at"], name="generated_f_owner_i_0b6945_idx"),
        ),
        migrations.AddIndex(
            model_name="generatedfilter",
            index=models.Index(fields=["study", "created_at"], name="generated_f_study_i_8b5b90_idx"),
        ),
        migrations.AddIndex(
            model_name="generatedfilter",
            index=models.Index(fields=["status"], name="generated_f_status_36035c_idx"),
        ),
    ]
