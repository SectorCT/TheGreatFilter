from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings
import secrets
import hashlib
from datetime import timedelta

class UserManager(BaseUserManager):
    def create_user(self, username=None, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")

        if not username:
            base_username = email.split("@")[0]
            username = base_username
            counter = 1
            while self.model.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    organization_name = models.CharField(max_length=255, blank=True)
    role_title = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=128, blank=True)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    objects = UserManager()

    def __str__(self):
        return self.email


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'password_reset_tokens'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.token:
            # Generate 6-digit code
            reset_code = f"{secrets.randbelow(900000) + 100000:06d}"
            self.token = hashlib.sha256(reset_code.encode()).hexdigest()
        
        if not self.expires_at:
            # Code expires in 1 hour
            self.expires_at = timezone.now() + timedelta(hours=1)
        
        super().save(*args, **kwargs)
    
    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        self.used = True
        self.save()
    
    def __str__(self):
        return f"Password reset token for {self.user.email}"