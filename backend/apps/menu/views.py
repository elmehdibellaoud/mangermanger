from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.common.permissions import IsGerant

from .models import Category, Dish, Ingredient
from .serializers import CategorySerializer, DishSerializer, IngredientSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsGerant]


class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    permission_classes = [IsGerant]


class DishViewSet(viewsets.ModelViewSet):
    queryset = Dish.objects.select_related("category").prefetch_related(
        "dish_ingredients__ingredient"
    )
    serializer_class = DishSerializer
    permission_classes = [IsGerant]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
