from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, PasswordChangeSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer, GoogleAuthSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.views import APIView    
from rest_framework import status, views
from rest_framework.renderers import JSONRenderer
from .models import User, PasswordResetToken
from rest_framework.permissions import BasePermission, IsAuthenticated, AllowAny
import json
import secrets
import hashlib
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class RegisterView(APIView):
    """
    User registration endpoint.
    Epic 1, Story 1.2: Implement User Registration with Email and Password
    """
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                'token': str(refresh.access_token),
                'refreshToken': str(refresh),
                'user': user_data
            }, status=status.HTTP_201_CREATED)

        error_messages = " ".join([" ".join(messages) for messages in serializer.errors.values()])
        return Response({"message": error_messages}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """
    User login endpoint with JWT authentication.
    Epic 1, Story 1.3: Implement User Login with JWT Authentication
    """
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                'token': str(refresh.access_token),
                'refreshToken': str(refresh),
                'user': user_data
            }, status=status.HTTP_200_OK)

        error_messages = " ".join([" ".join(messages) for messages in serializer.errors.values()])
        return Response({"message": error_messages}, status=status.HTTP_401_UNAUTHORIZED)
    

class LogoutView(APIView):
    """
    User logout endpoint with token blacklisting.
    """
    renderer_classes = [JSONRenderer]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token is None:
                return Response({"message": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({"message": "Logout successful."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PasswordChangeView(APIView):
    """
    Change password for authenticated users.
    Requires current password and new password.
    """
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)
        
        error_messages = " ".join([" ".join(messages) for messages in serializer.errors.values()])
        return Response({"message": error_messages}, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    """
    Request password reset via email.
    Sends reset token to user's email.
    """
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.get(email=email)
            
            # Generate 6-digit code
            reset_code = f"{secrets.randbelow(900000) + 100000:06d}"
            
            # Create password reset token with the code
            reset_token = PasswordResetToken.objects.create(user=user)
            reset_token.token = hashlib.sha256(reset_code.encode()).hexdigest()
            reset_token.save()
            
            try:
                send_mail(
                    'Password Reset Code - The Great Filter',
                    f'''Hello {user.username},

You requested a password reset for your The Great Filter account.

Your password reset code is: {reset_code}

Enter this 6-digit code in the password reset form. This code will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
The Great Filter Team''',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                return Response({
                    "message": "Password reset code sent to your email.",
                }, status=status.HTTP_200_OK)
            except Exception as e:
                # Return generic error message without exposing the code
                return Response({
                    "message": "Failed to send email. Please try again later.",
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        error_messages = " ".join([" ".join(messages) for messages in serializer.errors.values()])
        return Response({"message": error_messages}, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.
    Resets user's password with new password.
    """
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            code = serializer.validated_data['token']  # Still using 'token' field but now it's a code
            new_password = serializer.validated_data['new_password']
            
            try:
                # Find valid code
                code_hash = hashlib.sha256(code.encode()).hexdigest()
                reset_token = PasswordResetToken.objects.filter(
                    token=code_hash,
                    used=False,
                    expires_at__gt=timezone.now()
                ).first()
                
                if reset_token:
                    # Update user password
                    user = reset_token.user
                    user.set_password(new_password)
                    user.save()
                    
                    # Mark token as used
                    reset_token.mark_as_used()
                    
                    return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)
                else:
                    return Response({"message": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                return Response({"message": "Failed to reset password. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        error_messages = " ".join([" ".join(messages) for messages in serializer.errors.values()])
        return Response({"message": error_messages}, status=status.HTTP_400_BAD_REQUEST)

class GoogleAuthView(APIView):
    """
    Google OAuth login endpoint.
    Accepts Google access token and returns JWT tokens.
    """
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                'token': str(refresh.access_token),
                'refreshToken': str(refresh),
                'user': user_data
            }, status=status.HTTP_200_OK)

        error_messages = " ".join([" ".join(messages) for messages in serializer.errors.values()])
        return Response({"message": error_messages}, status=status.HTTP_400_BAD_REQUEST)