from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WaterMeasurement
from .serializers import (
    CsvImportUploadSerializer,
    WaterMeasurementCreateSerializer,
    WaterMeasurementDetailSerializer,
    WaterMeasurementLocationSerializer,
    WaterMeasurementListSerializer,
    WaterMeasurementOptionSerializer,
)
from .services.importers import parse_uploaded_measurement_csv


class WaterMeasurementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WaterMeasurement.objects.filter(owner=self.request.user).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WaterMeasurementCreateSerializer
        return WaterMeasurementListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        measurement = serializer.save()
        return Response({"measurementId": str(measurement.id)}, status=status.HTTP_201_CREATED)


class WaterMeasurementOptionsView(generics.ListAPIView):
    serializer_class = WaterMeasurementOptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WaterMeasurement.objects.filter(owner=self.request.user).order_by("-created_at")


class WaterMeasurementDetailView(generics.RetrieveAPIView):
    serializer_class = WaterMeasurementDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WaterMeasurement.objects.filter(owner=self.request.user) | WaterMeasurement.objects.filter(
            is_public=True
        )


class WaterMeasurementMapView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _map_snapshot_summary(latest_snapshot):
        latest_snapshot = latest_snapshot or {}
        return {
            "dateKey": latest_snapshot.get("dateKey"),
            "snapshotIndex": latest_snapshot.get("snapshotIndex"),
            "sampleTime": latest_snapshot.get("sampleTime"),
            "temperature": latest_snapshot.get("temperature"),
            "ph": latest_snapshot.get("ph"),
            "parameterCount": latest_snapshot.get("parameterCount") or len(latest_snapshot.get("parameters") or {}),
            "summary": latest_snapshot.get("summary"),
        }

    def get(self, request):
        queryset = WaterMeasurement.objects.filter(
            is_public=True,
            source=WaterMeasurement.SOURCE_GEMSTAT,
        ).exclude(external_station_id="").values(
            "id",
            "external_station_id",
            "name",
            "source",
            "sample_location",
            "date_count",
            "snapshot_count",
            "latest_snapshot",
        )

        locations = []
        for measurement in queryset.iterator(chunk_size=1000):
            sample_location = measurement["sample_location"] or {}
            location_id = measurement["external_station_id"] or sample_location.get("station_id")
            latitude = sample_location.get("latitude")
            longitude = sample_location.get("longitude")
            if not location_id or latitude is None or longitude is None:
                continue

            locations.append(
                {
                    "measurementId": measurement["id"],
                    "locationId": location_id,
                    "name": sample_location.get("station_identifier") or measurement["name"],
                    "source": measurement["source"],
                    "latitude": latitude,
                    "longitude": longitude,
                    "dateCount": measurement["date_count"] or 0,
                    "snapshotCount": measurement["snapshot_count"] or 0,
                    "latestSnapshot": self._map_snapshot_summary(measurement["latest_snapshot"]),
                    "sampleLocation": sample_location,
                }
            )

        serializer = WaterMeasurementLocationSerializer(locations, many=True)
        return Response({"results": serializer.data, "count": len(serializer.data)})


class WaterMeasurementLocationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, location_id):
        measurement = (
            WaterMeasurement.objects.filter(
                is_public=True,
                source=WaterMeasurement.SOURCE_GEMSTAT,
                external_station_id=location_id,
            )
            .order_by("-snapshot_count", "-sample_date", "-sample_time", "-created_at")
            .first()
        )
        if not measurement:
            raise NotFound("Location not found.")

        serializer = WaterMeasurementDetailSerializer(measurement)
        return Response(serializer.data)


class WaterMeasurementCsvImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        upload_serializer = CsvImportUploadSerializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)
        parsed = parse_uploaded_measurement_csv(upload_serializer.validated_data["file"])
        payload = {
            "name": upload_serializer.validated_data.get("name") or "CSV imported measurement",
            "source": WaterMeasurement.SOURCE_CSV,
            "temperature": parsed["temperature"],
            "ph": parsed["ph"],
            "parameters": parsed["parameters"],
            "raw_import_data": {"imported_from": "csv_upload"},
        }
        serializer = WaterMeasurementCreateSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        measurement = serializer.save()
        return Response({"measurementId": str(measurement.id)}, status=status.HTTP_201_CREATED)
