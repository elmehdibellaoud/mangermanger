"""All /api/admin/* routes for Back-Office (Gérant)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.views import EmployeeViewSet
from apps.dashboard.views import DashboardReviewsView, DashboardStatsView
from apps.hr.views import JobApplicationViewSet, JobOfferViewSet, ScheduleViewSet
from apps.menu.views import CategoryViewSet, DishViewSet, IngredientViewSet
from apps.reservations.views import AdminReservationViewSet
from apps.reviews.views import AdminReviewViewSet, SentimentPredictView
from apps.stock.views import StockItemViewSet, StockMovementViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="admin-category")
router.register("dishes", DishViewSet, basename="admin-dish")
router.register("ingredients", IngredientViewSet, basename="admin-ingredient")
router.register("stock", StockItemViewSet, basename="admin-stock")
router.register("stock-movements", StockMovementViewSet, basename="admin-stock-movement")
router.register("employees", EmployeeViewSet, basename="admin-employee")
router.register("schedules", ScheduleViewSet, basename="admin-schedule")
router.register("job-offers", JobOfferViewSet, basename="admin-job-offer")
router.register("job-applications", JobApplicationViewSet, basename="admin-job-application")
router.register("reviews", AdminReviewViewSet, basename="admin-review")
router.register("reservations", AdminReservationViewSet, basename="admin-reservation")


urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="admin-dashboard-stats"),
    path("dashboard/reviews/", DashboardReviewsView.as_view(), name="admin-dashboard-reviews"),
    path("sentiment/predict/", SentimentPredictView.as_view(), name="admin-sentiment-predict"),
]
