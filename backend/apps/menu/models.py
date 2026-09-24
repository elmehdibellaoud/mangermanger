from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify

from apps.common.models import TimeStampedModel


class Unit(models.TextChoices):
    KG = "kg", "Kilogramme"
    L = "L", "Litre"
    UNIT = "unit", "Unité"


class Category(TimeStampedModel):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Ingredient(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    unit = models.CharField(max_length=8, choices=Unit.choices, default=Unit.UNIT)
    cost_per_unit = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_unit_display()})"


class Dish(TimeStampedModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0.01)]
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="dishes"
    )
    image = models.ImageField(upload_to="dishes/", null=True, blank=True)
    is_available = models.BooleanField(default=True)
    prep_time = models.PositiveSmallIntegerField(
        help_text="Temps de préparation en minutes", default=15
    )
    ingredients = models.ManyToManyField(
        Ingredient, through="DishIngredient", related_name="dishes"
    )

    class Meta:
        ordering = ["category__display_order", "name"]
        constraints = [
            models.CheckConstraint(check=models.Q(price__gt=0), name="dish_price_positive"),
        ]

    def __str__(self) -> str:
        return self.name


class DishIngredient(models.Model):
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name="dish_ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    quantity = models.DecimalField(
        max_digits=10, decimal_places=3, validators=[MinValueValidator(0)]
    )

    class Meta:
        unique_together = [("dish", "ingredient")]

    def __str__(self) -> str:
        return f"{self.dish.name} — {self.ingredient.name} ×{self.quantity}"
