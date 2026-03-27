from django.db import migrations, models


DROP_LEGACY_COLUMNS_SQL = """
ALTER TABLE water_measurements DROP COLUMN IF EXISTS parameters_data;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS sample_location;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS raw_import_data;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS source_dataset;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS external_station_id;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS measurements_by_date;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS latest_snapshot;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS date_count;
ALTER TABLE water_measurements DROP COLUMN IF EXISTS snapshot_count;
DROP INDEX IF EXISTS water_measu_externa_288da3_idx;
DROP INDEX IF EXISTS water_measu_externa_5a70ba_idx;
CREATE INDEX IF NOT EXISTS water_measu_station_ce9d51_idx
ON water_measurements (station_id, sample_date);
"""


class Migration(migrations.Migration):
    dependencies = [
        ("measurements", "0006_copy_pollutants_data"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=DROP_LEGACY_COLUMNS_SQL,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.RemoveField(model_name="watermeasurement", name="parameters_data"),
                migrations.RemoveField(model_name="watermeasurement", name="sample_location"),
                migrations.RemoveField(model_name="watermeasurement", name="raw_import_data"),
                migrations.RemoveField(model_name="watermeasurement", name="source_dataset"),
                migrations.RemoveField(model_name="watermeasurement", name="external_station_id"),
                migrations.RemoveField(model_name="watermeasurement", name="measurements_by_date"),
                migrations.RemoveField(model_name="watermeasurement", name="latest_snapshot"),
                migrations.RemoveField(model_name="watermeasurement", name="date_count"),
                migrations.RemoveField(model_name="watermeasurement", name="snapshot_count"),
                migrations.RemoveIndex(
                    model_name="watermeasurement",
                    name="water_measu_externa_288da3_idx",
                ),
                migrations.RemoveIndex(
                    model_name="watermeasurement",
                    name="water_measu_externa_5a70ba_idx",
                ),
                migrations.AddIndex(
                    model_name="watermeasurement",
                    index=models.Index(fields=["station", "sample_date"], name="water_measu_station_ce9d51_idx"),
                ),
            ],
        ),
    ]
