from django.contrib import admin

from .models import Study


@admin.register(Study)
class StudyAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "status", "updated_at")
    search_fields = ("name", "owner__username", "owner__email")
    list_filter = ("status",)
