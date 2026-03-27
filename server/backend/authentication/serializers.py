from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import requests
import os
import base64
import json

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    userId = serializers.IntegerField(source='id', read_only=True)
    dateJoined = serializers.DateTimeField(source='date_joined', read_only=True)
    
    class Meta:
        model = User
        fields = (
            'userId',
            'username',
            'email',
            'full_name',
            'organization_name',
            'role_title',
            'country',
            'dateJoined',
        )

class RegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, label="Confirm Password")

    class Meta:
        model = User
        fields = (
            'email',
            'full_name',
            'organization_name',
            'role_title',
            'country',
            'password',
            'password2',
        )
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate(self, data):
        # Check that the two passwords match
        if data.get('password') != data.get('password2'):
            raise serializers.ValidationError("Passwords do not match.")

        # Check if the email is already in use
        if User.objects.filter(email=data.get('email')).exists():
            raise serializers.ValidationError("A user with this email already exists.")

        # Enforce Django password policy to stay consistent across auth flows.
        try:
            validate_password(data.get('password'))
        except DjangoValidationError as exc:
            raise serializers.ValidationError(" ".join(exc.messages))

        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            organization_name=validated_data.get('organization_name', ''),
            role_title=validated_data.get('role_title', ''),
            country=validated_data.get('country', ''),
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            user_obj = None

        user = authenticate(username=user_obj.username, password=password) if user_obj else None
        if not user:
            raise serializers.ValidationError('Incorrect email or password.')
        data['user'] = user
        return data

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField()

    def validate_new_password(self, value):
        validate_password(value)
        return value

class GoogleAuthSerializer(serializers.Serializer):
    access_token = serializers.CharField()

    def validate_access_token(self, value):
        """
        Validate the Google JWT credential from Google Identity Services
        """
        try:
            # For modern Google Identity Services, the credential is a JWT token
            # Decode the JWT to get user information
            if value.count('.') == 2:  # JWT format
                # Split the JWT token
                parts = value.split('.')
                
                # Decode the payload (middle part)
                payload = parts[1]
                
                # Add padding if needed
                padding = 4 - (len(payload) % 4)
                if padding != 4:
                    payload += '=' * padding
                
                # Decode base64
                decoded_bytes = base64.urlsafe_b64decode(payload)
                user_info = json.loads(decoded_bytes)
                
                # Validate required fields
                if not user_info.get('email'):
                    raise serializers.ValidationError('Email not provided by Google')
                
                if not user_info.get('sub'):  # Google uses 'sub' for user ID in JWT
                    raise serializers.ValidationError('User ID not provided by Google')
                
                # Convert to the format expected by the create method
                user_info['id'] = user_info['sub']
                
                return user_info
            else:
                # Fallback for legacy access token format
                response = requests.get(
                    'https://www.googleapis.com/oauth2/v2/userinfo',
                    params={'access_token': value}
                )
                
                if response.status_code != 200:
                    raise serializers.ValidationError('Invalid Google access token')
                
                user_info = response.json()
                
                # Validate required fields
                if not user_info.get('email'):
                    raise serializers.ValidationError('Email not provided by Google')
                
                if not user_info.get('id'):
                    raise serializers.ValidationError('User ID not provided by Google')
                
                return user_info
            
        except (ValueError, json.JSONDecodeError) as e:
            raise serializers.ValidationError('Invalid Google credential format')
        except requests.RequestException:
            raise serializers.ValidationError('Failed to validate Google credential')

    def create(self, validated_data):
        """
        Create or get user from Google OAuth data
        """
        user_info = validated_data['access_token']
        
        # Extract user data from Google response
        google_id = user_info['id']
        email = user_info['email']
        name = user_info.get('name', '')
        picture = user_info.get('picture', '')
        
        # Generate username from name or email
        if name:
            # Use the actual name from Google, cleaned up
            username = name.lower().replace(' ', '_').replace('.', '')
        else:
            # Fallback to email prefix
            username = email.split('@')[0] if email else google_id
        
        # Check if user already exists by email
        try:
            user = User.objects.get(email=email)
            # Don't change existing user's username - just return the existing user
            return user
        except User.DoesNotExist:
            # Create new user
            # Ensure username is unique
            base_username = username
            final_username = base_username
            counter = 1
            while User.objects.filter(username=final_username).exists():
                final_username = f"{base_username}_{counter}"
                counter += 1
            
            user = User.objects.create_user(
                username=final_username,
                email=email,
                password=None,  # No password for OAuth users
                is_active=True
            )
        
        return user
