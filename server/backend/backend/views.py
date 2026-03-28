"""
Health check and utility views for The Great Filter backend.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.conf import settings
from django.http import FileResponse, HttpResponse
import mimetypes
import os
from pathlib import Path


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint that verifies database connectivity.

    Returns:
        200 OK: All services healthy
        503 Service Unavailable: Database connection degraded
    """
    health_status = {
        'status': 'ok',
        'version': os.getenv('GIT_SHA', 'development'),
        'details': {}
    }

    # Check database connectivity
    try:
        connection.ensure_connection()
        health_status['details']['database'] = 'connected'
    except Exception as e:
        health_status['status'] = 'degraded'
        health_status['details']['database'] = f'error: {str(e)}'

    status_code = status.HTTP_200_OK if health_status['status'] == 'ok' else status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(health_status, status=status_code)


def frontend_view(request, path=''):
    """
    Serve the frontend application for all non-API routes.
    Serve real files under static/client/dist/ (e.g. assets/*.js); otherwise SPA index.html.
    """
    base = Path(settings.STATICFILES_DIRS[0]) / 'client' / 'dist'
    base_resolved = base.resolve()
    index_file_path = base / 'index.html'

    rel = (path or '').strip('/')
    if rel and not rel.startswith('api/'):
        candidate = (base / rel).resolve()
        try:
            candidate.relative_to(base_resolved)
        except ValueError:
            candidate = None
        if candidate is not None and candidate.is_file():
            content_type, _ = mimetypes.guess_type(str(candidate))
            return FileResponse(open(candidate, 'rb'), content_type=content_type or 'application/octet-stream')

    if index_file_path.is_file():
        return FileResponse(open(index_file_path, 'rb'), content_type='text/html')
    return HttpResponse(
        'Frontend not found. Please build the client application. Looking for: ' + str(index_file_path),
        status=404,
    )


def linux_appimage_download_view(request):
    """
    Serve the latest Linux AppImage build.

    Browsers are picky about large downloads: set an explicit Content-Length and
    stable attachment headers so the transfer does not end as "Failed" at 100%.
    """
    default_download_path = Path('/var/www/downloads/client-latest.AppImage')
    configured_download_path = getattr(settings, 'LINUX_APPIMAGE_PATH', None)
    appimage_path = Path(configured_download_path) if configured_download_path else default_download_path

    if not appimage_path.exists() or not appimage_path.is_file():
        return HttpResponse(f'Linux AppImage not found at: {appimage_path}', status=404)

    file_size = appimage_path.stat().st_size
    filename = 'client-latest.AppImage'

    # Open once; FileResponse will close the file when the response finishes.
    file_handle = open(appimage_path, 'rb')
    response = FileResponse(file_handle, as_attachment=True, filename=filename)
    response['Content-Type'] = 'application/octet-stream'
    response['Content-Length'] = str(file_size)
    response['Cache-Control'] = 'no-store, max-age=0'
    response['X-Content-Type-Options'] = 'nosniff'
    return response


def windows_setup_download_view(request):
    """Serve the Windows NSIS installer (same pattern as Linux AppImage)."""
    default_path = Path('/var/www/downloads/qlean-setup.exe')
    configured = getattr(settings, 'WINDOWS_SETUP_PATH', None)
    setup_path = Path(configured) if configured else default_path

    if not setup_path.exists() or not setup_path.is_file():
        return HttpResponse(f'Windows installer not found at: {setup_path}', status=404)

    file_size = setup_path.stat().st_size
    file_handle = open(setup_path, 'rb')
    response = FileResponse(file_handle, as_attachment=True, filename='qlean-setup.exe')
    response['Content-Type'] = 'application/octet-stream'
    response['Content-Length'] = str(file_size)
    response['Cache-Control'] = 'no-store, max-age=0'
    response['X-Content-Type-Options'] = 'nosniff'
    return response
