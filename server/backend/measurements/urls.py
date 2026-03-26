from django.urls import path

from .views import (
    WaterMeasurementCsvImportView,
    WaterMeasurementDetailView,
    WaterMeasurementListCreateView,
    WaterMeasurementMapView,
)


urlpatterns = [
    path("measurements/", WaterMeasurementListCreateView.as_view(), name="measurement-list-create"),
    path("measurements/map/", WaterMeasurementMapView.as_view(), name="measurement-map"),
    path("measurements/import/csv/", WaterMeasurementCsvImportView.as_view(), name="measurement-import-csv"),
    path("measurements/<uuid:pk>/", WaterMeasurementDetailView.as_view(), name="measurement-detail"),
]
