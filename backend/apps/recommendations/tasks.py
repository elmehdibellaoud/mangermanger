"""Periodic recomputation of recommendation matrices (Phase 5.B).

For MVP scale the engine runs per request; this stub is wired for Celery Beat
so a larger deployment can precompute + cache. Invoked every 6h.
"""
from celery import shared_task


@shared_task(name="recommendations.recompute_recommendations")
def recompute_recommendations() -> dict:
    # Warm the engine; heavy caching would go here (Redis matrices).
    from .engine import RecommendationEngine

    engine = RecommendationEngine()
    return {"dishes_indexed": len(engine._dishes)}
