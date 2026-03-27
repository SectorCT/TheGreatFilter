from django.contrib import admin

from .models import MeasurementImportRun, Station, WaterMeasurement


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("name", "external_station_id", "source_dataset", "country", "water_type")
    search_fields = ("name", "external_station_id", "local_station_number", "country")
    list_filter = ("source_dataset", "country", "water_type")


@admin.register(WaterMeasurement)
class WaterMeasurementAdmin(admin.ModelAdmin):
    list_display = ("name", "source", "owner", "station", "is_public", "sample_date")
    search_fields = ("name", "station__external_station_id", "station__name", "owner__email")
    list_filter = ("source", "is_public")


@admin.register(MeasurementImportRun)
class MeasurementImportRunAdmin(admin.ModelAdmin):
    list_display = ("source_name", "status", "files_seen", "measurements_created", "started_at")
    list_filter = ("source_name", "status")
