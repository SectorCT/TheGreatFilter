from django.core.management.base import BaseCommand, CommandError

from measurements.services.importers import sync_gemstat_measurements


class Command(BaseCommand):
    help = "Sync GEMStat dataset files into public WaterMeasurement records."

    def add_arguments(self, parser):
        parser.add_argument("dataset_dir", type=str, help="Path to the GEMStat dataset directory.")
        parser.add_argument(
            "--files",
            nargs="+",
            default=None,
            help="Optional list of dataset CSV file names to import.",
        )
        parser.add_argument(
            "--max-snapshots",
            type=int,
            default=None,
            help="Optional cap for the number of grouped measurement snapshots to import.",
        )

    def handle(self, *args, **options):
        dataset_dir = options["dataset_dir"]
        try:
            import_run = sync_gemstat_measurements(
                dataset_dir,
                included_filenames=options["files"],
                max_snapshots=options["max_snapshots"],
            )
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                "Sync completed: "
                f"created={import_run.measurements_created}, "
                f"updated={import_run.measurements_updated}, "
                f"skipped={import_run.measurements_skipped}"
            )
        )
