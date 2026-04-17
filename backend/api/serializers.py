"""
Serializers for N0ne-K1 API.

Includes:
  Plain Serializer (≥2):
    - LoginSerializer
    - MessageCreateSerializer

  ModelSerializer (≥2):
    - ChatSerializer
    - ApiKeySerializer
    - UserSettingsSerializer
    - UserSerializer
"""

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import Chat, Message, ApiKey, UserSettings
import re


# ─── Plain Serializers ───────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    """Validates login credentials (plain Serializer #1)."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        max_length=128, required=True, write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        user = authenticate(
            username=attrs['email'],
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')
        attrs['user'] = user
        return attrs


class MessageCreateSerializer(serializers.Serializer):
    """Validates incoming message data (plain Serializer #2)."""
    role = serializers.ChoiceField(choices=['user', 'assistant', 'system'], default='user')
    content = serializers.CharField(min_length=0, max_length=32000, allow_blank=True)
    images = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    model_used = serializers.CharField(max_length=128, required=False, allow_blank=True)
    tokens_used = serializers.IntegerField(default=0, required=False)

    def create(self, validated_data):
        chat = self.context['chat']
        return Message.objects.create(chat=chat, **validated_data)


# ─── Model Serializers ───────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    """Serializes basic User info (ModelSerializer #1)."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """Handles user registration (ModelSerializer, used in register view)."""
    password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']

    def validate(self, attrs):
        # 1. Password Match
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        
        # 2. Duplicate detection
        if User.objects.filter(username=attrs['email']).exists() or User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'Account with this email already exists.'})
        
        # 3. Complexity check
        pwd = attrs['password']
        if not re.search(r'[A-Z]', pwd) or not re.search(r'[a-z]', pwd) or not re.search(r'[0-9]', pwd):
            raise serializers.ValidationError({'password': 'Password must contain at least one uppercase, one lowercase and one digit.'})
            
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        # We store email in 'username' field to ensure global uniqueness and for login
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        # Auto-create settings with chosen display name
        UserSettings.objects.create(
            user=user,
            display_name=validated_data.get('username', '')
        )
        return user


class MessageSerializer(serializers.ModelSerializer):
    """Full message serializer (ModelSerializer #2)."""
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'images', 'model_used', 'tokens_used', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSerializer(serializers.ModelSerializer):
    """Full chat serializer with message count (ModelSerializer #3)."""
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ['id', 'title', 'model', 'message_count', 'last_message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'role': msg.role, 'content': msg.content[:100]}
        return None


class ChatDetailSerializer(serializers.ModelSerializer):
    """Chat detail with full messages."""
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Chat
        fields = ['id', 'title', 'model', 'messages', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ApiKeySerializer(serializers.ModelSerializer):
    """API key serializer — masks actual key (ModelSerializer #4)."""
    masked_key = serializers.SerializerMethodField()

    class Meta:
        model = ApiKey
        fields = ['id', 'label', 'key', 'masked_key', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at', 'masked_key']

    def get_masked_key(self, obj):
        if len(obj.key) > 8:
            return obj.key[:4] + '****' + obj.key[-4:]
        return '****'


class UserSettingsSerializer(serializers.ModelSerializer):
    """User settings serializer (ModelSerializer #5)."""
    class Meta:
        model = UserSettings
        fields = [
            'theme', 'language', 'default_model',
            'context_length', 'max_tokens', 'temperature',
            'updated_at',
            # Profile fields
            'display_name', 'bio', 'gender', 'birthday',
            'avatar_color', 'avatar_emoji',
        ]
        read_only_fields = ['updated_at']


class ChangePasswordSerializer(serializers.Serializer):
    """Validates and handles password change (plain Serializer)."""
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'new_password': 'New passwords do not match.'})
        return attrs
