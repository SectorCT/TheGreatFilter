from django.contrib import admin

from .models import FilterEvent, GeneratedFilter


@admin.register(GeneratedFilter)
class GeneratedFilterAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "study", "status", "measurement", "created_at")
    list_filter = ("status",)
    search_fields = ("owner__email",)


@admin.register(FilterEvent)
class FilterEventAdmin(admin.ModelAdmin):
    list_display = ("filter", "status", "created_at")
    list_filter = ("status",)
