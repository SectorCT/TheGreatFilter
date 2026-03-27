from django.db import transaction
from django.utils import timezone

from filters.models import FilterEvent, GeneratedFilter


def update_filter_status(
    generated_filter,
    *,
    status,
    internal_status="",
    progress_percent=0,
    current_step="",
    error_message="",
    extra=None,
):
    generated_filter.status = status
    generated_filter.internal_status = internal_status or status
    generated_filter.progress_percent = progress_percent
    generated_filter.current_step = current_step
    generated_filter.error_message = error_message

    if not generated_filter.started_at and status in {GeneratedFilter.STATUS_GENERATING, GeneratedFilter.STATUS_SUCCESS, GeneratedFilter.STATUS_FAILED}:
        generated_filter.started_at = timezone.now()
    if status in {GeneratedFilter.STATUS_SUCCESS, GeneratedFilter.STATUS_FAILED}:
        generated_filter.finished_at = timezone.now()

    with transaction.atomic():
        generated_filter.save(
            update_fields=[
                "status",
                "internal_status",
                "progress_percent",
                "current_step",
                "error_message",
                "started_at",
                "finished_at",
                "updated_at",
            ]
        )
        FilterEvent.objects.create(
            filter=generated_filter,
            status=status,
            message=current_step or status,
            extra=extra or {},
        )

    return generated_filter
