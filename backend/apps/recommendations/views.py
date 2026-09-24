from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsClient
from apps.menu.models import Dish

from .engine import RecommendationEngine, Suggestion


def _serialize(s: Suggestion) -> dict:
    d = s.dish
    return {
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "price": str(d.price),
        "image": d.image.url if d.image else None,
        "category": d.category.name,
        "score": s.score,
    }


class SimilarDishesView(APIView):
    """Public content-based similarity."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        # Surface a 404 for unknown/unavailable dishes to match the detail endpoint
        if not Dish.objects.filter(pk=pk, is_available=True).exists():
            return Response({"detail": "Not found."}, status=404)
        engine = RecommendationEngine()
        suggestions = engine.similar_dishes(int(pk))
        return Response({"results": [_serialize(s) for s in suggestions]})


class RecommendationsView(APIView):
    """Authenticated client — personalized recommendations, cold-start fallback."""

    permission_classes = [IsClient]

    def get(self, request):
        engine = RecommendationEngine()
        suggestions = engine.recommend_for_user(request.user)
        return Response({"results": [_serialize(s) for s in suggestions]})
