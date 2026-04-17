"""
Custom model managers for N0ne-K1 API.
"""

from django.db import models


class ChatManager(models.Manager):
    """
    Custom manager for the Chat model.
    Provides convenience query methods.
    """

    def active_for_user(self, user):
        """Return all non-deleted chats belonging to a user, newest first."""
        return self.filter(user=user, is_deleted=False).order_by('-updated_at')

    def recent(self, user, limit=20):
        """Return the most recently updated chats for a user."""
        return self.active_for_user(user)[:limit]

    def search(self, user, query):
        """Search chats by title for a given user."""
        return self.active_for_user(user).filter(title__icontains=query)
