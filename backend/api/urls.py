"""URL patterns for the N0ne-K1 API."""

from django.urls import path
from . import views

urlpatterns = [
    # ─── Auth ─────────────────────────────────────────────────────────────
    path('auth/login/',            views.login_view,           name='login'),
    path('auth/logout/',           views.logout_view,          name='logout'),
    path('auth/register/',         views.register_view,        name='register'),
    path('auth/change-password/',  views.change_password_view, name='change-password'),

    # ─── Chats ────────────────────────────────────────────────────────────
    path('chats/',          views.ChatListView.as_view(),   name='chat-list'),
    path('chats/<int:pk>/', views.ChatDetailView.as_view(), name='chat-detail'),

    # ─── Messages ─────────────────────────────────────────────────────────
    path('chats/<int:pk>/messages/', views.MessageListView.as_view(), name='message-list'),

    # ─── API Keys ─────────────────────────────────────────────────────────
    path('apikeys/',          views.ApiKeyView.as_view(),         name='apikey-list'),
    path('apikeys/<int:pk>/', views.ApiKeyDetailView.as_view(),   name='apikey-detail'),

    # ─── Settings & Profile ───────────────────────────────────────────────
    path('settings/', views.SettingsView.as_view(), name='settings'),
    path('profile/',  views.ProfileView.as_view(),  name='profile'),
]
