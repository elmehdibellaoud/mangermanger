from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import Role


class IsGerant(BasePermission):
    """Full admin — only users with role=GERANT."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.GERANT
        )


class IsServeurOrGerant(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {Role.SERVEUR, Role.GERANT}
        )


class IsKitchenStaff(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {Role.CUISINIER, Role.GERANT}
        )


class IsClient(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.CLIENT
        )


class ReadOnlyOrGerant(BasePermission):
    """Public reads, authenticated-gerant writes."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.GERANT
        )
