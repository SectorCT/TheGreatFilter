from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WaterMeasurement
from .serializers import (
    CsvImportUploadSerializer,
    WaterMeasurementCreateSerializer,
    WaterMeasurementDetailSerializer,
    WaterMeasurementListSerializer,
    WaterMeasurementMapSerializer,
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
        queryset = (
            WaterMeasurement.objects.filter(is_public=True)
            | WaterMeasurement.objects.filter(owner=request.user)
        )
        measurements = []
        for measurement in queryset.distinct().order_by("-created_at"):
            latitude = measurement.sample_location.get("latitude")
            longitude = measurement.sample_location.get("longitude")
            if latitude is None or longitude is None:
                continue
            measurements.append(measurement)

        serializer = WaterMeasurementMapSerializer(measurements, many=True)
        return Response({"results": serializer.data, "count": len(serializer.data)})


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
