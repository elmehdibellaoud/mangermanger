"""All /api/client/* routes (authenticated client portal)."""
from django.urls import path

from apps.accounts.client_views import ClientProfileView
from apps.orders.client_views import ClientOrdersView
from apps.promotions.views import LoyaltyView, PromoValidateView
from apps.reservations.views import MyReservationsView
from apps.reviews.client_views import ClientReviewListCreateView

urlpatterns = [
    path("profile/", ClientProfileView.as_view(), name="client-profile"),
    path("orders/", ClientOrdersView.as_view(), name="client-orders"),
    path("reservations/", MyReservationsView.as_view(), name="client-reservations"),
    path("reviews/", ClientReviewListCreateView.as_view(), name="client-reviews"),
    path("promo/validate/", PromoValidateView.as_view(), name="client-promo-validate"),
    path("loyalty/", LoyaltyView.as_view(), name="client-loyalty"),
]
