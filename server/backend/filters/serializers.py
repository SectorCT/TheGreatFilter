import csv
import io

from rest_framework import serializers

from measurements.models import WaterMeasurement
from studies.models import Study

from .models import GeneratedFilter


class GeneratedFilterListSerializer(serializers.ModelSerializer):
    filterId = serializers.UUIDField(source="id", read_only=True)
    measurementId = serializers.UUIDField(source="measurement.id", read_only=True)
    studyId = serializers.UUIDField(source="study.id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = GeneratedFilter
        fields = ["filterId", "studyId", "measurementId", "createdAt", "status"]


class GenerateFilterSerializer(serializers.Serializer):
    studyId = serializers.UUIDField()
    measurementId = serializers.UUIDField()

    def validate(self, attrs):
        request = self.context["request"]
        study = serializers.PrimaryKeyRelatedField(queryset=Study.objects.all()).to_internal_value(attrs["studyId"])
        measurement = serializers.PrimaryKeyRelatedField(queryset=WaterMeasurement.objects.all()).to_internal_value(
            attrs["measurementId"]
        )

        if study.owner != request.user:
            raise serializers.ValidationError({"studyId": "Study must belong to the authenticated user."})

        if measurement.owner != request.user and not measurement.is_public:
            raise serializers.ValidationError({"measurementId": "Measurement is not accessible."})

        if measurement.temperature is None or measurement.ph is None:
            raise serializers.ValidationError(
                {"measurementId": "Measurement must include temperature and pH before generation."}
            )

        attrs["study"] = study
        attrs["measurement"] = measurement
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        generated_filter = GeneratedFilter.objects.create(
            study=validated_data["study"],
            owner=request.user,
            measurement=validated_data["measurement"],
            status=GeneratedFilter.STATUS_PENDING,
            internal_status="accepted",
            experiment_payload={
                "studyId": str(validated_data["study"].id),
                "measurementId": str(validated_data["measurement"].id),
            },
        )
        return generated_filter


class GeneratedFilterStatusSerializer(serializers.ModelSerializer):
    filterId = serializers.UUIDField(source="id", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = GeneratedFilter
        fields = ["filterId", "status", "updatedAt"]


class GeneratedFilterDetailSerializer(serializers.ModelSerializer):
    filterId = serializers.UUIDField(source="id", read_only=True)
    studyId = serializers.UUIDField(source="study.id", read_only=True)
    measurementId = serializers.UUIDField(source="measurement.id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    filterInfo = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedFilter
        fields = ["filterId", "studyId", "measurementId", "status", "filterInfo", "createdAt"]

    def get_filterInfo(self, obj):
        return {
            "filterStructure": obj.filter_structure,
            "experimentPayload": obj.experiment_payload,
            "resultPayload": obj.result_payload,
            "summaryMetrics": obj.summary_metrics,
        }


def build_filter_csv(generated_filter):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["section", "key", "value"])
    for section_name, payload in [
        ("filter_structure", generated_filter.filter_structure),
        ("experiment_payload", generated_filter.experiment_payload),
        ("result_payload", generated_filter.result_payload),
        ("summary_metrics", generated_filter.summary_metrics),
    ]:
        if not payload:
            continue
        for key, value in payload.items():
            writer.writerow([section_name, key, value])
    return buffer.getvalue()
