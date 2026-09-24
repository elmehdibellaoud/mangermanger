"""Hybrid recommendation engine.

- Content-based: simple Jaccard on (category + ingredients + keywords).
- Collaborative: user-item ratings matrix with cosine user similarity.
- Cold-start fallback: top dishes weighted by rating × sentiment.

Kept dependency-light on purpose (no sklearn import chain at module load) so
tests and local dev stay fast. Swap in TF-IDF/SVD when production scale calls
for it.
"""
from __future__ import annotations

import math
import re
from collections import defaultdict
from dataclasses import dataclass

from django.db.models import Avg, Count, Q
from django.utils.functional import cached_property

from apps.accounts.models import User
from apps.menu.models import Dish
from apps.orders.models import OrderItem, OrderStatus
from apps.reviews.models import Review, Sentiment

_TOKEN_RE = re.compile(r"[A-Za-zÀ-ÿ]+", re.UNICODE)
_STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "avec",
    "au", "aux", "en", "a", "à", "sur", "pour", "sans", "the", "and", "or", "of",
}


def _tokenize(text: str) -> set[str]:
    return {t.lower() for t in _TOKEN_RE.findall(text or "") if t.lower() not in _STOPWORDS and len(t) > 2}


@dataclass
class Suggestion:
    dish: Dish
    score: float


class RecommendationEngine:
    """One-shot engine — cheap enough to run per request for MVP scale.

    For larger catalogs, cache `similar_matrix` / `user_vectors` in Redis via
    the Celery periodic task ``recompute_recommendations``.
    """

    def __init__(self):
        self._dishes = list(
            Dish.objects.filter(is_available=True)
            .select_related("category")
            .prefetch_related("dish_ingredients__ingredient")
        )

    # ---------- Content-based ----------

    @cached_property
    def _dish_features(self) -> dict[int, set[str]]:
        features = {}
        for dish in self._dishes:
            tokens = _tokenize(f"{dish.name} {dish.description}")
            tokens.add(f"cat:{dish.category.slug}")
            for di in dish.dish_ingredients.all():
                tokens.add(f"ing:{di.ingredient_id}")
            features[dish.id] = tokens
        return features

    def similar_dishes(self, dish_id: int, k: int = 5) -> list[Suggestion]:
        target = self._dish_features.get(dish_id)
        if not target:
            return []
        scored: list[Suggestion] = []
        by_id = {d.id: d for d in self._dishes}
        for other_id, feats in self._dish_features.items():
            if other_id == dish_id:
                continue
            union = len(target | feats)
            if not union:
                continue
            jaccard = len(target & feats) / union
            if jaccard > 0:
                scored.append(Suggestion(by_id[other_id], round(jaccard, 3)))
        scored.sort(key=lambda s: s.score, reverse=True)
        return scored[:k]

    # ---------- Collaborative filtering ----------

    def _user_ratings(self) -> dict[int, dict[int, float]]:
        """Return {user_id: {dish_id: score in [0, 1]}}."""
        ratings: dict[int, dict[int, float]] = defaultdict(dict)

        # Explicit reviews (weight 1.0, rating mapped to [0, 1])
        for r in Review.objects.values("client_id", "dish_id", "rating"):
            if r["client_id"]:
                ratings[r["client_id"]][r["dish_id"]] = max(
                    ratings[r["client_id"]].get(r["dish_id"], 0),
                    (r["rating"] - 1) / 4.0,
                )

        # Implicit (ordered) — boost scores modestly
        order_counts = (
            OrderItem.objects.filter(order__status=OrderStatus.PAID)
            .values("order__client_id", "dish_id")
            .annotate(n=Count("id"))
        )
        for row in order_counts:
            uid = row["order__client_id"]
            if not uid:
                continue
            implicit = min(0.7, 0.3 + 0.1 * row["n"])
            ratings[uid][row["dish_id"]] = max(ratings[uid].get(row["dish_id"], 0), implicit)
        return ratings

    def recommend_for_user(self, user: User, k: int = 10) -> list[Suggestion]:
        ratings = self._user_ratings()
        my = ratings.get(user.id, {})
        if not my:
            return self.popular_fallback(k)

        # Cosine similarity between users based on shared dishes
        sims: dict[int, float] = {}
        my_norm = math.sqrt(sum(v * v for v in my.values()))
        for other_id, other in ratings.items():
            if other_id == user.id:
                continue
            shared = set(my) & set(other)
            if not shared:
                continue
            dot = sum(my[d] * other[d] for d in shared)
            other_norm = math.sqrt(sum(v * v for v in other.values()))
            if my_norm and other_norm:
                sims[other_id] = dot / (my_norm * other_norm)

        # Weighted scores on dishes the user hasn't tried
        scores: dict[int, float] = defaultdict(float)
        for other_id, s in sims.items():
            for dish_id, r in ratings[other_id].items():
                if dish_id in my:
                    continue
                scores[dish_id] += s * r

        if not scores:
            return self.popular_fallback(k, exclude=set(my))

        by_id = {d.id: d for d in self._dishes}
        suggestions = [
            Suggestion(by_id[d], round(score, 3))
            for d, score in scores.items()
            if d in by_id
        ]
        suggestions.sort(key=lambda x: x.score, reverse=True)
        return suggestions[:k]

    # ---------- Cold-start fallback ----------

    def popular_fallback(self, k: int = 10, exclude: set[int] | None = None) -> list[Suggestion]:
        exclude = exclude or set()
        qs = (
            Dish.objects.filter(is_available=True)
            .exclude(id__in=exclude)
            .annotate(
                rating_avg=Avg("reviews__rating", filter=Q(reviews__is_approved=True)),
                pos_count=Count("reviews", filter=Q(reviews__sentiment=Sentiment.POSITIVE)),
                neg_count=Count("reviews", filter=Q(reviews__sentiment=Sentiment.NEGATIVE)),
            )
        )
        scored = []
        for d in qs:
            rating = float(d.rating_avg or 3.0)
            sentiment_boost = (d.pos_count - d.neg_count) / 10.0
            scored.append(Suggestion(d, round(rating + sentiment_boost, 3)))
        scored.sort(key=lambda s: s.score, reverse=True)
        return scored[:k]
