from django.contrib import admin

from .models import MeasurementImportRun, WaterMeasurement


@admin.register(WaterMeasurement)
class WaterMeasurementAdmin(admin.ModelAdmin):
    list_display = ("name", "source", "owner", "is_public", "external_station_id", "sample_date")
    search_fields = ("name", "external_station_id", "owner__email")
    list_filter = ("source", "is_public")


@admin.register(MeasurementImportRun)
class MeasurementImportRunAdmin(admin.ModelAdmin):
    list_display = ("source_name", "status", "files_seen", "measurements_created", "started_at")
    list_filter = ("source_name", "status")
