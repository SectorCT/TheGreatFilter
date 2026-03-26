from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0003_passwordresettoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="country",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="user",
            name="full_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="organization_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="role_title",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
