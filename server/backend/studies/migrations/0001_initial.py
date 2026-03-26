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
            name="Study",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(default="active", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="studies", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "db_table": "studies",
                "ordering": ["-updated_at"],
            },
        ),
        migrations.AddIndex(
            model_name="study",
            index=models.Index(fields=["owner", "updated_at"], name="studies_stu_owner_i_a54fa0_idx"),
        ),
        migrations.AddIndex(
            model_name="study",
            index=models.Index(fields=["status"], name="studies_stu_status_4a713d_idx"),
        ),
    ]
