from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("measurements", "0003_watermeasurement_aggregate_fields"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="watermeasurement",
            old_name="water_measu_externa_0bcab0_idx",
            new_name="water_measu_externa_5a70ba_idx",
        ),
    ]
