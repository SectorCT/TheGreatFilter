"""
URL configuration for The Great Filter backend.

Main URL routing for the API and frontend.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from .views import health_check, frontend_view, linux_appimage_download_view, windows_setup_download_view

urlpatterns = [
    # API Routes
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('authentication.urls')),
    path('api/', include('studies.urls')),
    path('api/', include('measurements.urls')),
    path('api/', include('filters.urls')),
    path('admin/', admin.site.urls),
    path('downloads/client-latest.AppImage', linux_appimage_download_view, name='linux_appimage_download'),
    path('downloads/qlean-setup.exe', windows_setup_download_view, name='windows_setup_download'),

    # Frontend Routes - Serve SPA for all non-API routes
    re_path(r'^(?!api/).*$', frontend_view, name='frontend'),
]
