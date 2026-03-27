import uuid
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("measurements", "0004_rename_water_measu_externa_0bcab0_idx_water_measu_externa_5a70ba_idx"),
    ]

    operations = [
        migrations.CreateModel(
            name="Station",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("source_dataset", models.CharField(max_length=128)),
                ("external_station_id", models.CharField(max_length=64)),
                ("name", models.CharField(max_length=255)),
                ("local_station_number", models.CharField(blank=True, max_length=128)),
                ("country", models.CharField(blank=True, max_length=128)),
                ("water_type", models.CharField(blank=True, max_length=128)),
                ("water_body_name", models.CharField(blank=True, max_length=255)),
                ("main_basin", models.CharField(blank=True, max_length=255)),
                ("latitude", models.FloatField(blank=True, null=True)),
                ("longitude", models.FloatField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "stations", "ordering": ["name", "external_station_id"]},
        ),
        migrations.AddConstraint(
            model_name="station",
            constraint=models.UniqueConstraint(
                fields=("source_dataset", "external_station_id"),
                name="unique_station_per_dataset",
            ),
        ),
        migrations.AddIndex(
            model_name="station",
            index=models.Index(fields=["source_dataset", "external_station_id"], name="stations_source__c21c59_idx"),
        ),
        migrations.AddIndex(
            model_name="station",
            index=models.Index(fields=["latitude", "longitude"], name="stations_latitud_2690e9_idx"),
        ),
        migrations.AddField(
            model_name="watermeasurement",
            name="station",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name="measurements",
                to="measurements.station",
            ),
        ),
        migrations.AddField(
            model_name="watermeasurement",
            name="pollutants_data",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
