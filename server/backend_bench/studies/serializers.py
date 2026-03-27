from rest_framework import serializers

from .models import Study


class StudySerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)

    class Meta:
        model = Study
        fields = [
            "id",
            "owner_id",
            "name",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner_id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Study name is required.")
        return value
