"""
Models for N0ne-K1 API.

Models:
  - Chat           (ForeignKey → User)   + custom ChatManager
  - Message        (ForeignKey → Chat)
  - ApiKey         (ForeignKey → User)
  - UserSettings   (ForeignKey → User)
"""

from django.db import models
from django.contrib.auth.models import User
from .managers import ChatManager


class Chat(models.Model):
    """Represents a conversation session."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chats',
    )
    title = models.CharField(max_length=255, default='New Chat')
    model = models.CharField(max_length=128, default='nvidia/nemotron-3-nano-30b-a3b:free')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Attach custom manager
    objects = ChatManager()

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'[{self.user.username}] {self.title}'


class Message(models.Model):
    """A single message within a Chat."""

    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]

    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default='user')
    content = models.TextField()
    images = models.JSONField(default=list, blank=True)
    model_used = models.CharField(max_length=128, blank=True, null=True)
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'[{self.role}] {self.content[:60]}'


class ApiKey(models.Model):
    """Stores OpenRouter API keys for a user."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='api_keys',
    )
    label = models.CharField(max_length=128, default='OpenRouter Key')
    key = models.CharField(max_length=512)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f'{self.user.username} — {self.label}'

    def save(self, *args, **kwargs):
        # If this key is being set as default, unset all others for this user
        if self.is_default:
            ApiKey.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class UserSettings(models.Model):
    """Per-user model and UI preferences."""

    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('system', 'System'),
    ]

    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ru', 'Русский'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='settings',
    )
    theme = models.CharField(max_length=16, choices=THEME_CHOICES, default='system')
    language = models.CharField(max_length=8, choices=LANGUAGE_CHOICES, default='en')
    default_model = models.CharField(max_length=128, default='nvidia/nemotron-3-nano-30b-a3b:free')
    context_length = models.IntegerField(default=32768)
    max_tokens = models.IntegerField(default=2048)
    temperature = models.FloatField(default=0.7)

    updated_at = models.DateTimeField(auto_now=True)

    # --- Profile fields ---
    display_name = models.CharField(max_length=128, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    gender = models.CharField(
        max_length=32,
        blank=True,
        default='',
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other'), ('prefer_not_to_say', 'Prefer not to say')]
    )
    birthday = models.DateField(blank=True, null=True)
    avatar_color = models.CharField(max_length=32, blank=True, default='#006950')
    avatar_emoji = models.CharField(max_length=8, blank=True, default='')

    def __str__(self):
        return f'Settings for {self.user.username}'
