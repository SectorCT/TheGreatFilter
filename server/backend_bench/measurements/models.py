import uuid

from django.conf import settings
from django.db import models


class Station(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_dataset = models.CharField(max_length=128)
    external_station_id = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    local_station_number = models.CharField(max_length=128, blank=True)
    country = models.CharField(max_length=128, blank=True)
    water_type = models.CharField(max_length=128, blank=True)
    water_body_name = models.CharField(max_length=255, blank=True)
    main_basin = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    measurement_count = models.PositiveIntegerField(default=0)
    latest_measurement_id = models.UUIDField(null=True, blank=True)
    latest_sample_date = models.DateField(null=True, blank=True)
    latest_sample_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stations"
        ordering = ["name", "external_station_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_dataset", "external_station_id"],
                name="unique_station_per_dataset",
            )
        ]
        indexes = [
            models.Index(fields=["source_dataset", "external_station_id"]),
            models.Index(fields=["source_dataset", "name", "external_station_id"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.external_station_id})"

    @property
    def location_payload(self):
        return {
            "station_id": self.external_station_id,
            "country": self.country or None,
            "water_type": self.water_type or None,
            "station_identifier": self.name or None,
            "water_body_name": self.water_body_name or None,
            "main_basin": self.main_basin or None,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "local_station_number": self.local_station_number or None,
        }


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
    station = models.ForeignKey(
        Station,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="measurements",
    )
    name = models.CharField(max_length=255)
    source = models.CharField(max_length=32, choices=SOURCE_CHOICES)
    temperature = models.FloatField(null=True, blank=True)
    ph = models.FloatField(null=True, blank=True)
    pollutants_data = models.JSONField(default=dict, blank=True)
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
            models.Index(fields=["station", "sample_date"]),
            models.Index(
                fields=["station", "-sample_date", "-sample_time", "-created_at"],
                condition=models.Q(is_public=True),
                name="water_measu_pub_latest_idx",
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def parameter_count(self):
        return len(self.pollutants_data)


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
