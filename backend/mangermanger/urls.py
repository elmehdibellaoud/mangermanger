from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from apps.accounts.views import ClientSearchView, MeView, RegisterView
from apps.menu.public_views import PublicDishDetailView, PublicMenuView
from apps.recommendations.views import RecommendationsView, SimilarDishesView
from apps.reservations.views import PublicAvailabilityView, PublicReservationCreateView


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/staff/clients/search/", ClientSearchView.as_view(), name="client-search"),
    path("api/admin/", include("mangermanger.api_admin")),
    path("api/staff/", include("mangermanger.api_staff")),
    path("api/client/", include("mangermanger.api_client")),
    path("api/public/menu/", PublicMenuView.as_view(), name="public-menu"),
    path("api/public/dishes/<int:pk>/", PublicDishDetailView.as_view(), name="public-dish"),
    path("api/public/dishes/<int:pk>/similar/", SimilarDishesView.as_view(), name="public-dish-similar"),
    path("api/public/reservations/", PublicReservationCreateView.as_view(), name="public-reservation"),
    path("api/public/availability/", PublicAvailabilityView.as_view(), name="public-availability"),
    path("api/client/recommendations/", RecommendationsView.as_view(), name="client-recommendations"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
