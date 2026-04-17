"""
Views for N0ne-K1 API.

Function-Based Views (FBV with DRF decorators):
  - login_view      POST /api/auth/login/
  - logout_view     POST /api/auth/logout/
  - register_view   POST /api/auth/register/

Class-Based Views (CBV with APIView):
  - ChatListView        GET/POST  /api/chats/
  - ChatDetailView      GET/PATCH/DELETE  /api/chats/<pk>/
  - MessageListView     GET/POST  /api/chats/<pk>/messages/
  - ApiKeyView          GET/POST  /api/apikeys/
  - ApiKeyDetailView    DELETE/PATCH  /api/apikeys/<pk>/
  - SettingsView        GET/PUT  /api/settings/
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Chat, Message, ApiKey, UserSettings
from .serializers import (
    LoginSerializer, RegisterSerializer, MessageCreateSerializer,
    ChatSerializer, ChatDetailSerializer,
    MessageSerializer, ApiKeySerializer, UserSettingsSerializer, UserSerializer,
    ChangePasswordSerializer,
)


# ─── Helper ─────────────────────────────────────────────────────────────────

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ─── FBV #1: Login ──────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    POST /api/auth/login/
    Body: { username, password }
    Returns: { access, refresh, user }
    """
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data['user']
    tokens = get_tokens_for_user(user)
    return Response({
        **tokens,
        'user': UserSerializer(user).data,
    }, status=status.HTTP_200_OK)


# ─── FBV #2: Logout ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /api/auth/logout/
    Body: { refresh }
    Blacklists the refresh token.
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─── FBV #3: Register ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    POST /api/auth/register/
    Body: { username, email, password, password2 }
    Returns: { access, refresh, user }
    """
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    tokens = get_tokens_for_user(user)
    return Response({
        **tokens,
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


# ─── CBV #1: Chat List ──────────────────────────────────────────────────────

class ChatListView(APIView):
    """
    GET  /api/chats/          → list all user chats
    POST /api/chats/          → create new chat
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        if query:
            chats = Chat.objects.search(request.user, query)
        else:
            chats = Chat.objects.active_for_user(request.user)
        serializer = ChatSerializer(chats, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        if serializer.is_valid():
            chat = serializer.save(user=request.user)
            return Response(ChatSerializer(chat).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── CBV #2: Chat Detail ────────────────────────────────────────────────────

class ChatDetailView(APIView):
    """
    GET    /api/chats/<pk>/   → get chat with messages
    PATCH  /api/chats/<pk>/   → update title/model
    DELETE /api/chats/<pk>/   → soft-delete chat
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(Chat, pk=pk, user=user, is_deleted=False)

    def get(self, request, pk):
        chat = self.get_object(pk, request.user)
        serializer = ChatDetailSerializer(chat)
        return Response(serializer.data)

    def patch(self, request, pk):
        chat = self.get_object(pk, request.user)
        serializer = ChatSerializer(chat, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        chat = self.get_object(pk, request.user)
        chat.is_deleted = True
        chat.save()
        return Response({'detail': 'Chat deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ─── CBV #3: Message List ───────────────────────────────────────────────────

class MessageListView(APIView):
    """
    GET  /api/chats/<pk>/messages/   → list messages in chat
    POST /api/chats/<pk>/messages/   → add message to chat
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        chat = get_object_or_404(Chat, pk=pk, user=request.user, is_deleted=False)
        messages = chat.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        chat = get_object_or_404(Chat, pk=pk, user=request.user, is_deleted=False)
        serializer = MessageCreateSerializer(data=request.data, context={'chat': chat})
        if serializer.is_valid():
            message = serializer.save()
            # Update chat's updated_at
            chat.save()
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── CBV #4: API Keys ───────────────────────────────────────────────────────

class ApiKeyView(APIView):
    """
    GET  /api/apikeys/   → list user's API keys
    POST /api/apikeys/   → add new API key
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        keys = ApiKey.objects.filter(user=request.user)
        serializer = ApiKeySerializer(keys, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ApiKeySerializer(data=request.data)
        if serializer.is_valid():
            key = serializer.save(user=request.user)
            return Response(ApiKeySerializer(key).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApiKeyDetailView(APIView):
    """
    PATCH  /api/apikeys/<pk>/   → update label or set as default
    DELETE /api/apikeys/<pk>/   → delete API key
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(ApiKey, pk=pk, user=user)

    def patch(self, request, pk):
        key = self.get_object(pk, request.user)
        serializer = ApiKeySerializer(key, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        key = self.get_object(pk, request.user)
        key.delete()
        return Response({'detail': 'API key deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ─── CBV #5: User Settings ──────────────────────────────────────────────────

class SettingsView(APIView):
    """
    GET /api/settings/   → get current user settings
    PUT /api/settings/   → update settings
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Profile View ────────────────────────────────────────────────────────────

class ProfileView(APIView):
    """GET /api/profile/ → current user info."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# ─── Change Password ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    POST /api/auth/change-password/
    Body: { current_password, new_password, confirm_password }
    """
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(serializer.validated_data['current_password']):
        return Response(
            {'current_password': 'Current password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)
