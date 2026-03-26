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
    WaterMeasurementLocationMeasurementSerializer,
    WaterMeasurementLocationSerializer,
    WaterMeasurementListSerializer,
    WaterMeasurementMapSerializer,
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

    def get(self, request):
        queryset = WaterMeasurement.objects.filter(
            is_public=True,
            source=WaterMeasurement.SOURCE_GEMSTAT,
        ).order_by("external_station_id", "-sample_date", "-sample_time", "-created_at")

        locations = {}
        for measurement in queryset:
            location_id = measurement.external_station_id or measurement.sample_location.get("station_id")
            latitude = measurement.sample_location.get("latitude")
            longitude = measurement.sample_location.get("longitude")
            if not location_id or latitude is None or longitude is None:
                continue

            if location_id not in locations:
                locations[location_id] = {
                    "locationId": location_id,
                    "name": measurement.sample_location.get("station_identifier") or measurement.name,
                    "source": measurement.source,
                    "latitude": latitude,
                    "longitude": longitude,
                    "measurementCount": 0,
                    "latestMeasurementId": measurement.id,
                    "latestSampleDate": measurement.sample_date,
                    "latestSampleTime": measurement.sample_time,
                    "sampleLocation": measurement.sample_location,
                }
            locations[location_id]["measurementCount"] += 1

        serializer = WaterMeasurementLocationSerializer(list(locations.values()), many=True)
        return Response({"results": serializer.data, "count": len(serializer.data)})


class WaterMeasurementLocationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, location_id):
        measurements = list(
            WaterMeasurement.objects.filter(
                is_public=True,
                source=WaterMeasurement.SOURCE_GEMSTAT,
                external_station_id=location_id,
            ).order_by("-sample_date", "-sample_time", "-created_at")
        )
        if not measurements:
            raise NotFound("Location not found.")

        first = measurements[0]
        serializer = WaterMeasurementLocationMeasurementSerializer(measurements, many=True)
        return Response(
            {
                "locationId": location_id,
                "name": first.sample_location.get("station_identifier") or first.name,
                "sampleLocation": first.sample_location,
                "measurementCount": len(measurements),
                "measurements": serializer.data,
            }
        )


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
