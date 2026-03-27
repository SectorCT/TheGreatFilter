from celery import shared_task

from filters.models import GeneratedFilter
from filters.services.runner import run_filter_generation
from filters.services.status import update_filter_status


@shared_task(bind=True, autoretry_for=(), retry_backoff=True, retry_jitter=True, max_retries=0)
def generate_filter(self, filter_id):
    generated_filter = GeneratedFilter.objects.select_related("measurement", "study").get(id=filter_id)

    try:
        update_filter_status(
            generated_filter,
            status=GeneratedFilter.STATUS_GENERATING,
            internal_status="preparing_input",
            progress_percent=10,
            current_step="Preparing filter generation input.",
        )

        update_filter_status(
            generated_filter,
            status=GeneratedFilter.STATUS_GENERATING,
            internal_status="running_generation",
            progress_percent=60,
            current_step="Running filter generation workflow.",
        )

        result = run_filter_generation(generated_filter)
        generated_filter.filter_structure = result["filter_structure"]
        generated_filter.experiment_payload = result["experiment_payload"]
        generated_filter.result_payload = result["result_payload"]
        generated_filter.summary_metrics = result["summary_metrics"]
        generated_filter.export_payload = result["export_payload"]
        generated_filter.save(
            update_fields=[
                "filter_structure",
                "experiment_payload",
                "result_payload",
                "summary_metrics",
                "export_payload",
                "updated_at",
            ]
        )

        update_filter_status(
            generated_filter,
            status=GeneratedFilter.STATUS_SUCCESS,
            internal_status="completed",
            progress_percent=100,
            current_step="Filter generation completed successfully.",
        )
    except Exception as exc:
        update_filter_status(
            generated_filter,
            status=GeneratedFilter.STATUS_FAILED,
            internal_status="failed",
            progress_percent=generated_filter.progress_percent,
            current_step="Filter generation failed.",
            error_message=str(exc),
        )
        raise
