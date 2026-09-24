"""All /api/staff/* routes (serveur + cuisinier/KDS)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.orders.views import KdsItemViewSet, KdsOrderViewSet, StaffOrderViewSet, TableViewSet

router = DefaultRouter()
router.register("tables", TableViewSet, basename="staff-table")
router.register("orders", StaffOrderViewSet, basename="staff-order")
router.register("kds/orders", KdsOrderViewSet, basename="kds-order")
router.register("kds/items", KdsItemViewSet, basename="kds-item")


urlpatterns = [
    path("", include(router.urls)),
]
