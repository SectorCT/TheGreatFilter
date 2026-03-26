from django.urls import path

from .views import StudyDetailView, StudyListCreateView


urlpatterns = [
    path("studies/", StudyListCreateView.as_view(), name="study-list-create"),
    path("studies/<uuid:pk>/", StudyDetailView.as_view(), name="study-detail"),
]
