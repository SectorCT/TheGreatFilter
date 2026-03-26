import io
from collections import OrderedDict
from datetime import date

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


def build_measurement_label(date_key, snapshot):
    summary = snapshot.get("summary")
    if summary:
        return f"{date_key} - {summary}"

    parts = [date_key]
    volume = snapshot.get("volume") or {}
    if volume.get("value") is not None:
        parts.append(f"water {volume['value']:g}{volume.get('unit') or ''}".strip())

    parameters = parameters_dict_to_list(snapshot.get("parameters") or {})
    if parameters:
        preview = ", ".join(
            f"{item.get('parameterCode') or item.get('parameterName')} {item.get('value'):g}{item.get('unit') or ''}".strip()
            for item in parameters[:3]
            if item.get("value") is not None
        )
        if preview:
            parts.append(preview)
    return " - ".join(parts)


def build_legacy_measurements_by_date(obj):
    date_key = obj.sample_date.isoformat() if obj.sample_date else date.today().isoformat()
    return {
        date_key: [
            {
                "sampleTime": obj.sample_time.isoformat() if obj.sample_time else None,
                "depth": obj.depth,
                "volume": None,
                "temperature": obj.temperature,
                "ph": obj.ph,
                "parameters": obj.parameters_data or {},
                "summary": None,
            }
        ]
    }


def get_measurements_by_date(obj):
    return obj.measurements_by_date or build_legacy_measurements_by_date(obj)


def get_primary_snapshot_value(obj, field_name):
    direct_value = getattr(obj, field_name, None)
    if direct_value is not None:
        return direct_value

    latest_snapshot = obj.get_latest_snapshot() if hasattr(obj, "get_latest_snapshot") else {}
    if latest_snapshot:
        return latest_snapshot.get(field_name)

    measurements_by_date = get_measurements_by_date(obj)
    for date_key in sorted(measurements_by_date.keys(), reverse=True):
        snapshots = measurements_by_date.get(date_key) or []
        if snapshots:
            return snapshots[0].get(field_name)
    return None


def build_measurement_rows(obj):
    rows = []
    measurements_by_date = get_measurements_by_date(obj)
    for date_key in sorted(measurements_by_date.keys(), reverse=True):
        snapshots = measurements_by_date.get(date_key) or []
        for index, snapshot in enumerate(snapshots):
            parameters = parameters_dict_to_list(snapshot.get("parameters") or {})
            rows.append(
                {
                    "dateKey": date_key,
                    "snapshotIndex": index,
                    "label": build_measurement_label(date_key, snapshot),
                    "sampleTime": snapshot.get("sampleTime"),
                    "depth": snapshot.get("depth"),
                    "volume": snapshot.get("volume"),
                    "temperature": snapshot.get("temperature"),
                    "ph": snapshot.get("ph"),
                    "parameterCount": len(parameters),
                    "parameters": parameters,
                    "summary": snapshot.get("summary"),
                }
            )
    return rows


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
    temperature = serializers.SerializerMethodField()
    ph = serializers.SerializerMethodField()
    dateCount = serializers.IntegerField(source="date_count", read_only=True)
    snapshotCount = serializers.IntegerField(source="snapshot_count", read_only=True)
    latestSnapshot = serializers.JSONField(source="latest_snapshot", read_only=True)

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
            "dateCount",
            "snapshotCount",
            "latestSnapshot",
        ]

    def get_temperature(self, obj):
        return get_primary_snapshot_value(obj, "temperature")

    def get_ph(self, obj):
        return get_primary_snapshot_value(obj, "ph")


class WaterMeasurementOptionSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    temperature = serializers.SerializerMethodField()
    ph = serializers.SerializerMethodField()
    latestSnapshot = serializers.JSONField(source="latest_snapshot", read_only=True)
    dateCount = serializers.IntegerField(source="date_count", read_only=True)

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "name",
            "source",
            "createdAt",
            "temperature",
            "ph",
            "dateCount",
            "latestSnapshot",
        ]

    def get_temperature(self, obj):
        return get_primary_snapshot_value(obj, "temperature")

    def get_ph(self, obj):
        return get_primary_snapshot_value(obj, "ph")


class WaterMeasurementDetailSerializer(serializers.ModelSerializer):
    measurementId = serializers.UUIDField(source="id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    sampleLocation = serializers.JSONField(source="sample_location", read_only=True)
    temperature = serializers.SerializerMethodField()
    ph = serializers.SerializerMethodField()
    measurementsByDate = serializers.SerializerMethodField()
    rows = serializers.SerializerMethodField()
    locationId = serializers.SerializerMethodField()
    dateCount = serializers.IntegerField(source="date_count", read_only=True)
    snapshotCount = serializers.IntegerField(source="snapshot_count", read_only=True)
    latestSnapshot = serializers.JSONField(source="latest_snapshot", read_only=True)

    class Meta:
        model = WaterMeasurement
        fields = [
            "measurementId",
            "locationId",
            "name",
            "source",
            "createdAt",
            "temperature",
            "ph",
            "sampleLocation",
            "dateCount",
            "snapshotCount",
            "latestSnapshot",
            "rows",
            "measurementsByDate",
        ]

    def get_measurementsByDate(self, obj):
        return get_measurements_by_date(obj)

    def get_temperature(self, obj):
        return get_primary_snapshot_value(obj, "temperature")

    def get_ph(self, obj):
        return get_primary_snapshot_value(obj, "ph")

    def get_rows(self, obj):
        return build_measurement_rows(obj)

    def get_locationId(self, obj):
        return obj.external_station_id or obj.sample_location.get("station_id") or str(obj.id)


class WaterMeasurementCreateSerializer(serializers.ModelSerializer):
    parameters = MeasurementParameterSerializer(many=True, required=False, default=list)
    sampleLocation = serializers.JSONField(source="sample_location", required=False)
    sampleDate = serializers.DateField(required=False, allow_null=True)
    sampleTime = serializers.TimeField(required=False, allow_null=True)
    depth = serializers.FloatField(required=False, allow_null=True)
    volume = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = WaterMeasurement
        fields = [
            "name",
            "source",
            "temperature",
            "ph",
            "parameters",
            "sampleLocation",
            "sampleDate",
            "sampleTime",
            "depth",
            "volume",
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
        sample_date = validated_data.pop("sampleDate", None) or date.today()
        sample_time = validated_data.pop("sampleTime", None)
        depth = validated_data.pop("depth", None)
        volume = validated_data.pop("volume", None)
        validated_data["owner"] = self.context["request"].user
        validated_data["name"] = validated_data.get("name") or f"Measurement {validated_data['source']}"
        parameters_data = normalize_parameters_list(parameters)
        snapshot = {
            "sampleTime": sample_time.isoformat() if sample_time else None,
            "depth": depth,
            "volume": volume,
            "temperature": validated_data.get("temperature"),
            "ph": validated_data.get("ph"),
            "parameters": parameters_data,
            "summary": None,
        }
        validated_data["parameters_data"] = parameters_data
        validated_data["measurements_by_date"] = {sample_date.isoformat(): [snapshot]}
        validated_data["latest_snapshot"] = {
            "dateKey": sample_date.isoformat(),
            "snapshotIndex": 0,
            "sampleTime": snapshot["sampleTime"],
            "depth": depth,
            "volume": volume,
            "temperature": snapshot["temperature"],
            "ph": snapshot["ph"],
            "parameters": parameters_data,
            "summary": None,
            "parameterCount": len(parameters_data),
        }
        validated_data["date_count"] = 1
        validated_data["snapshot_count"] = 1
        validated_data["sample_date"] = sample_date
        validated_data["sample_time"] = sample_time
        validated_data["depth"] = depth
        return WaterMeasurement.objects.create(**validated_data)


class WaterMeasurementLocationSerializer(serializers.Serializer):
    measurementId = serializers.UUIDField()
    locationId = serializers.CharField()
    name = serializers.CharField(allow_null=True)
    source = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    dateCount = serializers.IntegerField()
    snapshotCount = serializers.IntegerField()
    latestSnapshot = serializers.JSONField()
    sampleLocation = serializers.JSONField()


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
