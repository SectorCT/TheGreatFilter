from django.db import migrations


def forward_copy_pollutants_data(apps, schema_editor):
    WaterMeasurement = apps.get_model("measurements", "WaterMeasurement")
    db_alias = schema_editor.connection.alias
    table_name = WaterMeasurement._meta.db_table

    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor,
                table_name,
            )
        }

    if "parameters_data" not in columns:
        return

    for measurement in WaterMeasurement.objects.using(db_alias).iterator():
        parameters_data = measurement.parameters_data or {}
        slimmed = {}
        for code, payload in parameters_data.items():
            parameter_code = (payload.get("parameterCode") or code or "").strip()
            if not parameter_code:
                continue
            value = payload.get("value")
            if value in ("", None):
                continue
            slimmed[parameter_code] = {
                "parameterCode": parameter_code,
                "parameterName": payload.get("parameterName") or None,
                "unit": payload.get("unit") or None,
                "value": value,
            }
        measurement.pollutants_data = slimmed
        measurement.save(update_fields=["pollutants_data"])


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("measurements", "0005_station_measurement_refactor"),
    ]

    operations = [
        migrations.RunPython(forward_copy_pollutants_data, migrations.RunPython.noop),
    ]
