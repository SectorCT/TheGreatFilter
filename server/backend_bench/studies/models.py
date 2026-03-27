import uuid

from django.conf import settings
from django.db import models


class Study(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="studies",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=32, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "studies"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["owner", "updated_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.name
