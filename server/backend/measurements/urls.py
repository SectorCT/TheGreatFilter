from django.urls import path

from .views import (
    WaterMeasurementCsvImportView,
    WaterMeasurementDetailView,
    WaterMeasurementListCreateView,
    WaterMeasurementLocationDetailView,
    WaterMeasurementMapView,
    WaterMeasurementOptionsView,
)


urlpatterns = [
    path("measurements/", WaterMeasurementListCreateView.as_view(), name="measurement-list-create"),
    path("measurements/options/", WaterMeasurementOptionsView.as_view(), name="measurement-options"),
    path("measurements/map/", WaterMeasurementMapView.as_view(), name="measurement-map"),
    path("measurements/locations/<str:location_id>/", WaterMeasurementLocationDetailView.as_view(), name="measurement-location-detail"),
    path("measurements/import/csv/", WaterMeasurementCsvImportView.as_view(), name="measurement-import-csv"),
    path("measurements/<uuid:pk>/", WaterMeasurementDetailView.as_view(), name="measurement-detail"),
]
