import uuid

from django.conf import settings
from django.db import models


class GeneratedFilter(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_GENERATING = "Generating"
    STATUS_SUCCESS = "Success"
    STATUS_FAILED = "Failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_GENERATING, "Generating"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    study = models.ForeignKey("studies.Study", on_delete=models.CASCADE, related_name="filters")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="generated_filters",
    )
    measurement = models.ForeignKey(
        "measurements.WaterMeasurement",
        on_delete=models.PROTECT,
        related_name="generated_filters",
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    internal_status = models.CharField(max_length=64, blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    current_step = models.CharField(max_length=255, blank=True)
    filter_structure = models.JSONField(default=dict, blank=True)
    experiment_payload = models.JSONField(default=dict, blank=True)
    result_payload = models.JSONField(default=dict, blank=True)
    summary_metrics = models.JSONField(default=dict, blank=True)
    export_payload = models.JSONField(default=dict, blank=True)
    used_quantum_computer = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "generated_filters"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "created_at"]),
            models.Index(fields=["study", "created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.id} - {self.status}"


class FilterEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filter = models.ForeignKey(GeneratedFilter, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=16)
    message = models.CharField(max_length=255)
    extra = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "filter_events"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.filter_id} {self.status}"
