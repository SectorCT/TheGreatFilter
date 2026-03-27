from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("measurements", "0002_rename_water_measu_owner_i_999559_idx_water_measu_owner_i_421842_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="watermeasurement",
            name="measurements_by_date",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="watermeasurement",
            name="latest_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="watermeasurement",
            name="date_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="watermeasurement",
            name="snapshot_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddIndex(
            model_name="watermeasurement",
            index=models.Index(fields=["external_station_id", "source"], name="water_measu_externa_0bcab0_idx"),
        ),
    ]
