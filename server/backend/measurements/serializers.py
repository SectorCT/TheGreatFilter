import io
from collections import OrderedDict

from rest_framework import serializers

from .models import Station, WaterMeasurement


def normalize_parameters_list(parameters):
    normalized = OrderedDict()
    for item in parameters or []:
        code = (item.get("parameterCode") or "").strip()
        if not code:
            raise serializers.ValidationError({"parameters": "parameterCode is required for each parameter."})
        if item.get("value") in ("", None):
            raise serializers.ValidationError({"parameters": f"value is required for parameter {code}."})

        normalized[code] = {
            "parameterCode": code,
            "parameterName": item.get("parameterName") or None,
            "unit": item.get("unit") or None,
            "value": item.get("value"),
        }
    return normalized


def parameters_dict_to_list(parameters_data):
    if not parameters_data:
        return []
    return list(parameters_data.values())


def build_filtering_for_list(parameters_data):
    filtering_for = []
    for parameter in parameters_dict_to_list(parameters_data):
        code = (parameter.get("parameterCode") or "").strip()
        if not code or code.upper() in {"TEMP", "PH"}:
            continue
        filtering_for.append(
            {
                "parameterCode": code,
                "parameterName": parameter.get("parameterName") or None,
                "unit": parameter.get("unit") or None,
            }
        )
    return filtering_for


class MeasurementParameterSerializer(serializers.Serializer):
    parameterCode = serializers.CharField()
    parameterName = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    unit = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    value = serializers.FloatField()


class StationSummarySerializer(serializers.ModelSerializer):
    stationId = serializers.CharField(source="external_station_id", read_only=True)

    class Meta:
        model = Station
        fields = [
            "stationId",
            "name",
            "country",
            "water_type",
            "water_body_name",
            "main_basin",
            "latitude",
            "longitude",
        ]


class WaterMeasurementListSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    stationId = serializers.CharField(source="station.external_station_id", read_only=True)
    parameterCount = serializers.IntegerField(source="parameter_count", read_only=True)
    parameters = serializers.SerializerMethodField()
    filteringFor = serializers.SerializerMethodField()

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "source",
            "createdAt",
            "temperature",
            "ph",
            "stationId",
            "parameterCount",
            "parameters",
            "filteringFor",
        ]

    def get_parameters(self, obj):
        return parameters_dict_to_list(obj.pollutants_data)

    def get_filteringFor(self, obj):
        return build_filtering_for_list(obj.pollutants_data)


class WaterMeasurementOptionSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    stationId = serializers.CharField(source="station.external_station_id", read_only=True)
    parameterCount = serializers.IntegerField(source="parameter_count", read_only=True)
    filteringFor = serializers.SerializerMethodField()

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "source",
            "createdAt",
            "temperature",
            "ph",
            "stationId",
            "parameterCount",
            "filteringFor",
        ]

    def get_filteringFor(self, obj):
        return build_filtering_for_list(obj.pollutants_data)


class WaterMeasurementDetailSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    parameters = serializers.SerializerMethodField()
    sampleDate = serializers.DateField(source="sample_date", read_only=True)
    sampleTime = serializers.TimeField(source="sample_time", read_only=True)
    stationId = serializers.CharField(source="station.external_station_id", read_only=True)
    station = StationSummarySerializer(read_only=True)
    sampleLocation = serializers.SerializerMethodField()
    filteringFor = serializers.SerializerMethodField()

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "source",
            "createdAt",
            "temperature",
            "ph",
            "depth",
            "sampleDate",
            "sampleTime",
            "stationId",
            "station",
            "parameters",
            "filteringFor",
            "sampleLocation",
        ]

    def get_parameters(self, obj):
        return parameters_dict_to_list(obj.pollutants_data)

    def get_sampleLocation(self, obj):
        return obj.station.location_payload if obj.station_id else None

    def get_filteringFor(self, obj):
        return build_filtering_for_list(obj.pollutants_data)


class WaterMeasurementCreateSerializer(serializers.ModelSerializer):
    parameters = MeasurementParameterSerializer(many=True, required=False, default=list)
    sampleDate = serializers.DateField(source="sample_date", required=False, allow_null=True)
    sampleTime = serializers.TimeField(source="sample_time", required=False, allow_null=True)
    depth = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = WaterMeasurement
        fields = [
            "name",
            "source",
            "temperature",
            "ph",
            "parameters",
            "sampleDate",
            "sampleTime",
            "depth",
        ]

    def validate(self, attrs):
        if attrs.get("temperature") is None:
            raise serializers.ValidationError({"temperature": "temperature is required."})
        if attrs.get("ph") is None:
            raise serializers.ValidationError({"ph": "ph is required."})
        return attrs

    def create(self, validated_data):
        parameters = validated_data.pop("parameters", [])
        validated_data["owner"] = self.context["request"].user
        validated_data["name"] = validated_data.get("name") or f"Measurement {validated_data['source']}"
        validated_data["pollutants_data"] = normalize_parameters_list(parameters)
        return WaterMeasurement.objects.create(**validated_data)


class StationMapSerializer(serializers.ModelSerializer):
    stationId = serializers.CharField(source="external_station_id", read_only=True)
    locationId = serializers.CharField(source="external_station_id", read_only=True)
    source = serializers.CharField(source="source_dataset", read_only=True)
    measurementCount = serializers.IntegerField(source="measurement_count", read_only=True)
    latestMeasurementId = serializers.UUIDField(source="latest_measurement_id", read_only=True, allow_null=True)
    latestSampleDate = serializers.DateField(source="latest_sample_date", read_only=True, allow_null=True)
    latestSampleTime = serializers.TimeField(source="latest_sample_time", read_only=True, allow_null=True)
    sampleLocation = serializers.SerializerMethodField()

    class Meta:
        model = Station
        fields = [
            "stationId",
            "locationId",
            "name",
            "source",
            "latitude",
            "longitude",
            "measurementCount",
            "latestMeasurementId",
            "latestSampleDate",
            "latestSampleTime",
            "sampleLocation",
        ]

    def get_sampleLocation(self, obj):
        return obj.location_payload


class StationMeasurementSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    sampleDate = serializers.DateField(source="sample_date", read_only=True)
    sampleTime = serializers.TimeField(source="sample_time", read_only=True)
    parameterCount = serializers.IntegerField(source="parameter_count", read_only=True)
    pollutants = serializers.SerializerMethodField()

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "sampleDate",
            "sampleTime",
            "depth",
            "temperature",
            "ph",
            "parameterCount",
            "pollutants",
        ]

    def get_pollutants(self, obj):
        return parameters_dict_to_list(obj.pollutants_data)


class CsvImportUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    name = serializers.CharField(required=False, allow_blank=True)

    def parse_rows(self):
        upload = self.validated_data["file"]
        text = upload.read().decode("utf-8-sig")
        rows = []
        for line in io.StringIO(text):
            rows.append(line.rstrip("\n"))
        return rows
