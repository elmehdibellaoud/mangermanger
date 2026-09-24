from rest_framework import permissions
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import OrderItem
from apps.reviews.models import Review

from .models import Category, Dish


class PublicMenuView(APIView):
    """Public menu grouped by category — available dishes only."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        dishes = Dish.objects.filter(is_available=True).select_related("category")
        by_cat: dict[int, list[dict]] = {}
        for d in dishes:
            by_cat.setdefault(d.category_id, []).append({
                "id": d.id,
                "name": d.name,
                "description": d.description,
                "price": str(d.price),
                "image": d.image.url if d.image else None,
                "prep_time": d.prep_time,
            })
        return Response({
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "slug": c.slug,
                    "display_order": c.display_order,
                    "dishes": by_cat.get(c.id, []),
                }
                for c in categories
            ],
        })


class PublicDishDetailView(APIView):
    """Dish detail + approved reviews."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        dish = get_object_or_404(
            Dish.objects.select_related("category"), pk=pk, is_available=True
        )
        reviews_qs = (
            Review.objects.filter(dish=dish, is_approved=True)
            .select_related("client")
            .order_by("-created_at")
        )
        ratings = list(reviews_qs.values_list("rating", flat=True))
        avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

        def reviewer_name(r):
            if not r.client_id:
                return "anonyme"
            return r.client.first_name or r.client.email.split("@")[0]

        # Has the authenticated client already ordered this dish, and not yet reviewed?
        can_review = False
        already_reviewed = False
        if request.user.is_authenticated:
            ordered = OrderItem.objects.filter(
                order__client=request.user, dish=dish
            ).exists()
            already_reviewed = Review.objects.filter(
                client=request.user, dish=dish
            ).exists()
            can_review = ordered and not already_reviewed

        return Response({
            "id": dish.id,
            "name": dish.name,
            "description": dish.description,
            "price": str(dish.price),
            "image": dish.image.url if dish.image else None,
            "prep_time": dish.prep_time,
            "category": {"id": dish.category_id, "name": dish.category.name},
            "rating_average": avg,
            "rating_count": len(ratings),
            "can_review": can_review,
            "already_reviewed": already_reviewed,
            "reviews": [
                {
                    "id": r.id,
                    "client": reviewer_name(r),
                    "rating": r.rating,
                    "comment": r.comment,
                    "sentiment": r.sentiment,
                    "created_at": r.created_at,
                }
                for r in reviews_qs[:20]
            ],
        })
