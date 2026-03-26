from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import GeneratedFilter
from .serializers import (
    GeneratedFilterDetailSerializer,
    GeneratedFilterListSerializer,
    GeneratedFilterStatusSerializer,
    GenerateFilterSerializer,
    build_filter_csv,
)
from .services.status import update_filter_status
from .tasks import generate_filter


class GeneratedFilterListView(generics.ListAPIView):
    serializer_class = GeneratedFilterListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GeneratedFilter.objects.filter(owner=self.request.user).select_related("measurement")


class GenerateFilterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateFilterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        generated_filter = serializer.save()

        def enqueue():
            try:
                task = generate_filter.apply_async(args=[str(generated_filter.id)], queue="simulation")
                generated_filter.celery_task_id = task.id or ""
                generated_filter.save(update_fields=["celery_task_id", "updated_at"])
                update_filter_status(
                    generated_filter,
                    status=GeneratedFilter.STATUS_PENDING,
                    internal_status="queued",
                    progress_percent=1,
                    current_step="Filter generation queued.",
                )
            except Exception as exc:
                update_filter_status(
                    generated_filter,
                    status=GeneratedFilter.STATUS_FAILED,
                    internal_status="queue_failed",
                    progress_percent=0,
                    current_step="Failed to enqueue filter generation.",
                    error_message=str(exc),
                )

        transaction.on_commit(enqueue)

        return Response(
            {"filterId": str(generated_filter.id), "status": generated_filter.status},
            status=status.HTTP_202_ACCEPTED,
        )


class GeneratedFilterStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, filter_id):
        generated_filter = get_object_or_404(GeneratedFilter, id=filter_id, owner=request.user)
        serializer = GeneratedFilterStatusSerializer(generated_filter)
        return Response(serializer.data)


class GeneratedFilterDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, filter_id):
        generated_filter = get_object_or_404(GeneratedFilter, id=filter_id, owner=request.user)
        serializer = GeneratedFilterDetailSerializer(generated_filter)
        return Response(serializer.data)


class GeneratedFilterExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, filter_id):
        generated_filter = get_object_or_404(GeneratedFilter, id=filter_id, owner=request.user)
        if generated_filter.status != GeneratedFilter.STATUS_SUCCESS:
            return Response(
                {"detail": "CSV export is only available when the filter generation succeeded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        csv_content = build_filter_csv(generated_filter)
        response = HttpResponse(csv_content, content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="filter-{generated_filter.id}.csv"'
        return response
