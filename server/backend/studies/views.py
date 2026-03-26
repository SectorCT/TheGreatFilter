from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Study
from .serializers import StudySerializer


class StudyListCreateView(generics.ListCreateAPIView):
    serializer_class = StudySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Study.objects.filter(owner=self.request.user).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class StudyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Study.objects.filter(owner=self.request.user)
