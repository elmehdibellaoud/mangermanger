"""Sentiment analysis — pluggable backends.

Default backend is a lightweight keyword analyzer (FR/EN/AR lexicon) so the app
works out of the box and tests stay deterministic. Set
``SENTIMENT_MODEL_ENABLED=True`` in settings to switch to the HuggingFace model
(``cardiffnlp/twitter-xlm-roberta-base-sentiment``, multilingual).
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Protocol

from django.conf import settings
from django.core.cache import cache

_CACHE_PREFIX = "reco:sent"
_CACHE_TTL = 60 * 60 * 24  # 1 day


@dataclass
class SentimentResult:
    sentiment: str  # POSITIVE | NEUTRAL | NEGATIVE
    score: float    # 0..1 confidence


class Analyzer(Protocol):
    def analyze(self, text: str) -> SentimentResult: ...


# ========================== Keyword backend ==========================

# Small multilingual lexicon. Enough for the demo; real product would use HF.
POSITIVE_WORDS = {
    # FR
    "adoré", "adorer", "délicieux", "excellent", "parfait", "top", "savoureux",
    "génial", "bon", "bonne", "super", "agréable", "meilleur", "recommande",
    "frais", "généreux", "chaleureux", "rapide", "accueillant", "raffiné",
    # EN
    "love", "loved", "great", "amazing", "perfect", "delicious",
    "wonderful", "fantastic", "recommend", "best", "tasty", "fresh", "nice",
    "awesome", "superb", "good",
    # AR (latin transliteration + arabic script)
    "rai3", "zwin", "bnin", "mzyan",
    "رائع", "ممتاز", "لذيذ", "جيد",
}

NEGATIVE_WORDS = {
    # FR
    "catastrophique", "mauvais", "horrible", "décevant", "décevante", "froid",
    "froide", "sale", "lent", "lente", "désagréable", "nul", "nulle", "pire",
    "dégoûtant", "dégoûtante", "raté", "ratée", "moyen", "médiocre", "cher",
    "insipide", "fade", "dur", "brulé", "brûlée",
    # EN
    "terrible", "awful", "bad", "worst", "disgusting", "cold", "slow", "rude",
    "dirty", "overcooked", "undercooked", "bland", "hate", "hated", "poor",
    "mediocre", "overpriced", "expensive",
    # AR
    "khayb", "ma3jebnich", "meskin",
    "سيء", "رديء", "مقزز", "بارد",
}


_WORD_RE = re.compile(r"[A-Za-zÀ-ÿ\u0600-\u06FF']+", re.UNICODE)


class KeywordAnalyzer:
    def analyze(self, text: str) -> SentimentResult:
        tokens = {t.lower() for t in _WORD_RE.findall(text or "")}
        pos = len(tokens & POSITIVE_WORDS)
        neg = len(tokens & NEGATIVE_WORDS)
        total = pos + neg
        if total == 0:
            return SentimentResult("NEUTRAL", 0.5)
        if pos > neg:
            return SentimentResult("POSITIVE", round(0.5 + 0.5 * (pos - neg) / max(total, 1), 3))
        if neg > pos:
            return SentimentResult("NEGATIVE", round(0.5 + 0.5 * (neg - pos) / max(total, 1), 3))
        return SentimentResult("NEUTRAL", 0.6)


# ========================== HuggingFace backend ==========================


class HuggingFaceAnalyzer:
    """Loads the model lazily, once per process."""

    _pipeline = None
    MODEL_NAME = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
    LABEL_MAP = {"positive": "POSITIVE", "neutral": "NEUTRAL", "negative": "NEGATIVE"}

    @classmethod
    def _get_pipeline(cls):
        if cls._pipeline is None:
            from transformers import pipeline  # local import keeps tests light

            cls._pipeline = pipeline(
                "sentiment-analysis",
                model=cls.MODEL_NAME,
                tokenizer=cls.MODEL_NAME,
            )
        return cls._pipeline

    def analyze(self, text: str) -> SentimentResult:
        truncated = (text or "")[:512]
        result = self._get_pipeline()(truncated)[0]
        return SentimentResult(
            sentiment=self.LABEL_MAP.get(result["label"].lower(), "NEUTRAL"),
            score=round(float(result["score"]), 3),
        )


# ========================== Dispatcher ==========================


_INSTANCE: Analyzer | None = None


def get_analyzer() -> Analyzer:
    global _INSTANCE
    if _INSTANCE is not None:
        return _INSTANCE
    if getattr(settings, "SENTIMENT_MODEL_ENABLED", False):
        _INSTANCE = HuggingFaceAnalyzer()
    else:
        _INSTANCE = KeywordAnalyzer()
    return _INSTANCE


def reset_analyzer_for_tests():
    """Allow tests to swap the analyzer."""
    global _INSTANCE
    _INSTANCE = None


def analyze_text(text: str) -> SentimentResult:
    """Cached analyze: identical texts skip reanalysis."""
    key = f"{_CACHE_PREFIX}:{hashlib.md5((text or '').encode('utf-8')).hexdigest()}"
    cached = cache.get(key)
    if cached:
        return SentimentResult(**cached)
    result = get_analyzer().analyze(text or "")
    cache.set(key, {"sentiment": result.sentiment, "score": result.score}, _CACHE_TTL)
    return result
