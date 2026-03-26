import io
from collections import OrderedDict

from rest_framework import serializers

from .models import WaterMeasurement


def normalize_parameters_list(parameters):
    normalized = OrderedDict()
    for item in parameters or []:
        code = (item.get("parameterCode") or "").strip()
        if not code:
            raise serializers.ValidationError({"parameters": "parameterCode is required for each parameter."})
        if item.get("value") in ("", None):
            raise serializers.ValidationError({"parameters": f"value is required for parameter {code}."})

        normalized[code] = {
            "file": item.get("file") or None,
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


class MeasurementParameterSerializer(serializers.Serializer):
    file = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    parameterCode = serializers.CharField()
    parameterName = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    unit = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    value = serializers.FloatField()


class WaterMeasurementListSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    sampleLocation = serializers.JSONField(source="sample_location", read_only=True)

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "source",
            "createdAt",
            "temperature",
            "ph",
            "sampleLocation",
        ]


class WaterMeasurementDetailSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    parameters = serializers.SerializerMethodField()
    sampleLocation = serializers.JSONField(source="sample_location", read_only=True)

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "source",
            "createdAt",
            "temperature",
            "ph",
            "parameters",
            "sampleLocation",
        ]

    def get_parameters(self, obj):
        return parameters_dict_to_list(obj.parameters_data)


class WaterMeasurementCreateSerializer(serializers.ModelSerializer):
    parameters = MeasurementParameterSerializer(many=True, required=False, default=list)
    sampleLocation = serializers.JSONField(source="sample_location", required=False)

    class Meta:
        model = WaterMeasurement
        fields = [
            "name",
            "source",
            "temperature",
            "ph",
            "parameters",
            "sampleLocation",
            "raw_import_data",
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
        validated_data["parameters_data"] = normalize_parameters_list(parameters)
        return WaterMeasurement.objects.create(**validated_data)


class WaterMeasurementMapSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    parameterCount = serializers.IntegerField(source="parameter_count", read_only=True)
    sampleLocation = serializers.JSONField(source="sample_location", read_only=True)
    sampleDate = serializers.DateField(source="sample_date", read_only=True)
    sampleTime = serializers.TimeField(source="sample_time", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "source",
            "temperature",
            "ph",
            "latitude",
            "longitude",
            "parameterCount",
            "sampleDate",
            "sampleTime",
            "sampleLocation",
            "createdAt",
        ]

    def get_latitude(self, obj):
        return obj.sample_location.get("latitude")

    def get_longitude(self, obj):
        return obj.sample_location.get("longitude")


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
