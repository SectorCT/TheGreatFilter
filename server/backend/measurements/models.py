import uuid

from django.conf import settings
from django.db import models


class WaterMeasurement(models.Model):
    SOURCE_MANUAL = "manual"
    SOURCE_LAB = "lab_equipment"
    SOURCE_GEMSTAT = "gemstat"
    SOURCE_CSV = "csv_import"

    SOURCE_CHOICES = [
        (SOURCE_MANUAL, "Manual"),
        (SOURCE_LAB, "Lab equipment"),
        (SOURCE_GEMSTAT, "GemStat"),
        (SOURCE_CSV, "CSV import"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="water_measurements",
    )
    name = models.CharField(max_length=255)
    source = models.CharField(max_length=32, choices=SOURCE_CHOICES)
    temperature = models.FloatField(null=True, blank=True)
    ph = models.FloatField(null=True, blank=True)
    parameters_data = models.JSONField(default=dict, blank=True)
    measurements_by_date = models.JSONField(default=dict, blank=True)
    latest_snapshot = models.JSONField(default=dict, blank=True)
    date_count = models.PositiveIntegerField(default=0)
    snapshot_count = models.PositiveIntegerField(default=0)
    sample_location = models.JSONField(default=dict, blank=True)
    raw_import_data = models.JSONField(default=dict, blank=True)
    source_dataset = models.CharField(max_length=128, blank=True)
    external_station_id = models.CharField(max_length=64, blank=True)
    sample_date = models.DateField(null=True, blank=True)
    sample_time = models.TimeField(null=True, blank=True)
    depth = models.FloatField(null=True, blank=True)
    source_key = models.CharField(max_length=255, null=True, blank=True, unique=True)
    import_hash = models.CharField(max_length=64, blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "water_measurements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "created_at"]),
            models.Index(fields=["source", "created_at"]),
            models.Index(fields=["is_public"]),
            models.Index(fields=["external_station_id", "sample_date"]),
            models.Index(fields=["external_station_id", "source"]),
        ]

    def __str__(self):
        return self.name

    @property
    def parameter_count(self):
        if self.parameters_data:
            return len(self.parameters_data)

        latest_parameters = (self.latest_snapshot or {}).get("parameters") or {}
        return len(latest_parameters)

    def get_snapshot(self, date_key, snapshot_index=0):
        snapshots = (self.measurements_by_date or {}).get(date_key) or []
        if snapshot_index < 0 or snapshot_index >= len(snapshots):
            raise IndexError("Snapshot index is out of range.")
        return snapshots[snapshot_index]

    def get_latest_snapshot(self):
        if self.latest_snapshot:
            return self.latest_snapshot

        if not self.measurements_by_date:
            return {}

        latest_date = sorted(self.measurements_by_date.keys())[-1]
        snapshots = self.measurements_by_date.get(latest_date) or []
        if not snapshots:
            return {}
        return snapshots[-1]


class MeasurementImportRun(models.Model):
    STATUS_RUNNING = "running"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_RUNNING, "Running"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_name = models.CharField(max_length=128)
    dataset_path = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_RUNNING)
    files_seen = models.PositiveIntegerField(default=0)
    measurements_created = models.PositiveIntegerField(default=0)
    measurements_updated = models.PositiveIntegerField(default=0)
    measurements_skipped = models.PositiveIntegerField(default=0)
    error_log = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "measurement_import_runs"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.source_name} import {self.started_at}"
