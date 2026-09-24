from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    dish_name = serializers.CharField(source="dish.name", read_only=True)
    client_email = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id", "client", "client_email", "dish", "dish_name",
            "rating", "comment", "is_approved",
            "sentiment", "sentiment_score", "analyzed_at",
            "created_at",
        ]
        read_only_fields = [
            "sentiment", "sentiment_score", "analyzed_at", "created_at",
        ]

    def get_client_email(self, obj) -> str:
        return obj.client.email if obj.client_id else "anonyme"


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["dish", "comment"]
