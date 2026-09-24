from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsGerant, IsServeurOrGerant

from .models import Role, User
from .serializers import MeSerializer, RegisterSerializer, UserSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    """Admin CRUD for staff users (non-clients)."""

    serializer_class = UserSerializer
    permission_classes = [IsGerant]

    def get_queryset(self):
        return User.objects.exclude(role=Role.CLIENT).order_by("email")

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"status": "deactivated"}, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ClientSearchView(generics.ListAPIView):
    """Search clients by email, first_name, last_name — staff + gérant only.

    Gated to serveur/gérant for attaching orders to clients or assigning
    reservations. Returns only CLIENT role accounts.
    """

    serializer_class = MeSerializer
    permission_classes = [IsServeurOrGerant]
    pagination_class = None

    def get_queryset(self):
        q = (self.request.query_params.get("q") or "").strip()
        qs = User.objects.filter(role=Role.CLIENT, is_active=True)
        if q:
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
            )
        return qs.order_by("email")[:20]
