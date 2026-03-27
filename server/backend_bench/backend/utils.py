from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    Ensures all errors return JSON with 'message' field as per Epic1-Story2.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Get the error details
        error_details = response.data
        
        # Handle different response formats
        if isinstance(error_details, dict):
            # If it's a validation error dict, wrap with message and errors
            if 'detail' in error_details:
                # Single error message
                custom_response_data = {
                    'message': error_details['detail']
                }
            else:
                # Validation errors
                custom_response_data = {
                    'message': 'Validation failed',
                    'errors': error_details
                }
        else:
            # Non-dict response (e.g., string)
            custom_response_data = {
                'message': str(error_details)
            }
        
        response.data = custom_response_data
    
    return response
