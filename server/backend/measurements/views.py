from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Station, WaterMeasurement
from .serializers import (
    CsvImportUploadSerializer,
    StationMapSerializer,
    StationMeasurementSerializer,
    StationSummarySerializer,
    WaterMeasurementCreateSerializer,
    WaterMeasurementDetailSerializer,
    WaterMeasurementListSerializer,
    WaterMeasurementOptionSerializer,
)
from .services.importers import parse_uploaded_measurement_csv


def build_station_location_payload(station_row):
    return {
        "station_id": station_row["external_station_id"],
        "country": station_row["country"] or None,
        "water_type": station_row["water_type"] or None,
        "station_identifier": station_row["name"] or None,
        "water_body_name": station_row["water_body_name"] or None,
        "main_basin": station_row["main_basin"] or None,
        "latitude": station_row["latitude"],
        "longitude": station_row["longitude"],
        "local_station_number": station_row["local_station_number"] or None,
    }


class WaterMeasurementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            WaterMeasurement.objects.filter(owner=self.request.user)
            .select_related("station")
            .only(
                "id",
                "name",
                "source",
                "created_at",
                "temperature",
                "ph",
                "pollutants_data",
                "station_id",
                "station__external_station_id",
            )
            .order_by("-created_at")
        )

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
        return (
            WaterMeasurement.objects.filter(owner=self.request.user)
            .select_related("station")
            .only(
                "id",
                "name",
                "source",
                "created_at",
                "temperature",
                "ph",
                "pollutants_data",
                "station_id",
                "station__external_station_id",
            )
            .order_by("-created_at")
        )


class WaterMeasurementDetailView(generics.RetrieveAPIView):
    serializer_class = WaterMeasurementDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        measurement = generics.get_object_or_404(
            WaterMeasurement.objects.select_related("station").only(
                "id",
                "owner_id",
                "station_id",
                "station__external_station_id",
                "station__name",
                "station__country",
                "station__water_type",
                "station__water_body_name",
                "station__main_basin",
                "station__latitude",
                "station__longitude",
                "station__local_station_number",
                "name",
                "source",
                "temperature",
                "ph",
                "pollutants_data",
                "sample_date",
                "sample_time",
                "depth",
                "created_at",
                "is_public",
            ),
            pk=self.kwargs["pk"],
        )
        if measurement.owner_id != self.request.user.id and not measurement.is_public:
            raise NotFound("Measurement not found.")
        return measurement


class WaterMeasurementMapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station_rows = list(
            Station.objects.filter(source_dataset="gemstat")
            .values(
                "external_station_id",
                "name",
                "source_dataset",
                "country",
                "water_type",
                "water_body_name",
                "main_basin",
                "latitude",
                "longitude",
                "local_station_number",
                "measurement_count",
                "latest_measurement_id",
                "latest_sample_date",
                "latest_sample_time",
            )
            .order_by("name", "external_station_id")
        )

        results = [
            {
                "stationId": station_row["external_station_id"],
                "locationId": station_row["external_station_id"],
                "name": station_row["name"],
                "source": station_row["source_dataset"],
                "latitude": station_row["latitude"],
                "longitude": station_row["longitude"],
                "measurementCount": station_row["measurement_count"],
                "latestMeasurementId": station_row["latest_measurement_id"],
                "latestSampleDate": station_row["latest_sample_date"],
                "latestSampleTime": station_row["latest_sample_time"],
                "sampleLocation": build_station_location_payload(station_row),
            }
            for station_row in station_rows
        ]
        return Response({"results": results, "count": len(results)})


class WaterMeasurementLocationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, location_id):
        station = Station.objects.only(
            "id",
            "external_station_id",
            "name",
            "country",
            "water_type",
            "water_body_name",
            "main_basin",
            "latitude",
            "longitude",
            "local_station_number",
        ).filter(
            source_dataset="gemstat",
            external_station_id=location_id,
        ).first()
        if not station:
            raise NotFound("Location not found.")

        measurements = list(
            WaterMeasurement.objects.filter(
                is_public=True,
                station=station,
            )
            .only(
                "id",
                "name",
                "sample_date",
                "sample_time",
                "depth",
                "temperature",
                "ph",
                "pollutants_data",
            )
            .order_by("-sample_date", "-sample_time", "-created_at")
        )
        if not measurements:
            raise NotFound("Location not found.")

        serializer = StationMeasurementSerializer(measurements, many=True)
        return Response(
            {
                "stationId": station.external_station_id,
                "locationId": station.external_station_id,
                "name": station.name,
                "sampleLocation": station.location_payload,
                "measurementCount": len(measurements),
                "station": StationSummarySerializer(station).data,
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
        }
        serializer = WaterMeasurementCreateSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        measurement = serializer.save()
        return Response({"measurementId": str(measurement.id)}, status=status.HTTP_201_CREATED)
