from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('filters', '0002_rename_generated_f_owner_i_0b6945_idx_generated_f_owner_i_a80439_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='generatedfilter',
            name='used_quantum_computer',
            field=models.BooleanField(default=False),
        ),
    ]
