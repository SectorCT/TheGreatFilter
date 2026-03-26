from django.urls import path

from .views import (
    GeneratedFilterDetailView,
    GeneratedFilterExportView,
    GeneratedFilterListView,
    GeneratedFilterStatusView,
    GenerateFilterView,
)


urlpatterns = [
    path("filters/", GeneratedFilterListView.as_view(), name="filter-list"),
    path("filters/generate/", GenerateFilterView.as_view(), name="filter-generate"),
    path("filters/<uuid:filter_id>/status/", GeneratedFilterStatusView.as_view(), name="filter-status"),
    path("filters/<uuid:filter_id>/", GeneratedFilterDetailView.as_view(), name="filter-detail"),
    path("filters/<uuid:filter_id>/export/", GeneratedFilterExportView.as_view(), name="filter-export"),
]
