"""Admin configuration for N0ne-K1 API models."""

from django.contrib import admin
from .models import Chat, Message, ApiKey, UserSettings


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'model', 'is_deleted', 'created_at', 'updated_at']
    list_filter = ['is_deleted', 'model']
    search_fields = ['title', 'user__username']
    raw_id_fields = ['user']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['role', 'chat', 'model_used', 'tokens_used', 'created_at']
    list_filter = ['role']
    search_fields = ['content']
    raw_id_fields = ['chat']


@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ['label', 'user', 'is_default', 'created_at']
    list_filter = ['is_default']
    search_fields = ['label', 'user__username']
    raw_id_fields = ['user']


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'theme', 'language', 'default_model', 'temperature', 'updated_at']
    search_fields = ['user__username']
