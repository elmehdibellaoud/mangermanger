"""
Seed baseline data for local development and demo.

Usage: python manage.py seed [--fresh]
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Profile, Role, User
from apps.menu.models import Category, Dish, DishIngredient, Ingredient, Unit
from apps.orders.models import Table
from apps.stock.models import StockItem

DEFAULT_PASSWORD = "demo1234!"


CATEGORIES = [
    {"name": "Entrées", "display_order": 1},
    {"name": "Plats", "display_order": 2},
    {"name": "Desserts", "display_order": 3},
]

INGREDIENTS = [
    ("Tomate", Unit.KG, "6.50"),
    ("Oignon", Unit.KG, "4.00"),
    ("Ail", Unit.KG, "18.00"),
    ("Huile d'olive", Unit.L, "65.00"),
    ("Farine", Unit.KG, "9.00"),
    ("Sucre", Unit.KG, "12.00"),
    ("Beurre", Unit.KG, "78.00"),
    ("Lait", Unit.L, "7.50"),
    ("Œuf", Unit.UNIT, "1.80"),
    ("Poulet", Unit.KG, "52.00"),
    ("Bœuf haché", Unit.KG, "78.00"),
    ("Saumon", Unit.KG, "145.00"),
    ("Pommes de terre", Unit.KG, "5.00"),
    ("Fromage parmesan", Unit.KG, "180.00"),
    ("Pâtes", Unit.KG, "14.00"),
    ("Riz basmati", Unit.KG, "18.00"),
    ("Citron", Unit.UNIT, "2.50"),
    ("Salade", Unit.UNIT, "5.00"),
    ("Chocolat noir", Unit.KG, "95.00"),
    ("Menthe", Unit.UNIT, "3.00"),
]

DISHES = [
    # (name, category_name, price, description, prep_time)
    ("Salade César", "Entrées", "58.00", "Laitue croquante, parmesan, croûtons maison, sauce César.", 10),
    ("Carpaccio de saumon", "Entrées", "89.00", "Saumon frais, huile d'olive citron, fleur de sel.", 8),
    ("Velouté de tomates", "Entrées", "42.00", "Velouté maison et basilic frais.", 12),
    ("Tajine de poulet", "Plats", "95.00", "Poulet fermier mijoté aux citrons confits et olives.", 35),
    ("Pâtes carbonara", "Plats", "78.00", "Spaghetti, guanciale, œuf, parmesan.", 15),
    ("Burger MangerManger", "Plats", "85.00", "Bœuf haché 180g, cheddar, oignons confits, frites maison.", 18),
    ("Saumon grillé", "Plats", "120.00", "Pavé de saumon, purée de pommes de terre.", 20),
    ("Risotto aux cèpes", "Plats", "98.00", "Riz arborio, parmesan, crème de cèpes.", 25),
    ("Couscous royal", "Plats", "110.00", "Agneau, poulet, merguez, semoule et légumes.", 30),
    ("Steak frites", "Plats", "115.00", "Entrecôte grillée, frites maison, sauce au poivre.", 18),
    ("Pizza Margherita", "Plats", "72.00", "Tomate, mozzarella di bufala, basilic.", 15),
    ("Fondant au chocolat", "Desserts", "48.00", "Cœur coulant, glace vanille.", 12),
    ("Crème brûlée", "Desserts", "42.00", "Vanille de Madagascar.", 8),
    ("Tarte au citron", "Desserts", "45.00", "Pâte sablée, crème citron, meringue.", 10),
    ("Tiramisu maison", "Desserts", "48.00", "Mascarpone, café et cacao.", 6),
]

TABLES = [(i, 2 if i % 3 == 0 else 4) for i in range(1, 11)]


class Command(BaseCommand):
    help = "Seed baseline data (users, menu, tables, stock)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Delete existing seeded data before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, fresh: bool = False, **options):
        if fresh:
            self.stdout.write("Wiping existing seed data…")
            Dish.objects.all().delete()
            Ingredient.objects.all().delete()
            Category.objects.all().delete()
            Table.objects.all().delete()
            User.objects.filter(email__endswith="@mangermanger.dev").delete()

        self._seed_users()
        cats = self._seed_categories()
        ings = self._seed_ingredients()
        self._seed_dishes(cats, ings)
        self._seed_tables()

        self.stdout.write(self.style.SUCCESS("Seed complete."))
        self.stdout.write("Login with: gerant@mangermanger.dev / demo1234!")

    def _seed_users(self):
        users = [
            ("gerant@mangermanger.dev", Role.GERANT, "Amine", "Bennani"),
            ("serveur1@mangermanger.dev", Role.SERVEUR, "Leïla", "Zahra"),
            ("serveur2@mangermanger.dev", Role.SERVEUR, "Youssef", "Alaoui"),
            ("chef@mangermanger.dev", Role.CUISINIER, "Karim", "Idrissi"),
            ("client@mangermanger.dev", Role.CLIENT, "Sara", "Chakir"),
        ]
        for email, role, first, last in users:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"role": role, "first_name": first, "last_name": last},
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.is_staff = role == Role.GERANT
                user.is_superuser = role == Role.GERANT
                user.save()
                Profile.objects.get_or_create(user=user)
                self.stdout.write(f"  + user {email} ({role})")

    def _seed_categories(self) -> dict[str, Category]:
        result = {}
        for data in CATEGORIES:
            cat, _ = Category.objects.get_or_create(name=data["name"], defaults=data)
            result[cat.name] = cat
        return result

    def _seed_ingredients(self) -> dict[str, Ingredient]:
        result = {}
        for name, unit, cost in INGREDIENTS:
            ing, _ = Ingredient.objects.get_or_create(
                name=name,
                defaults={"unit": unit, "cost_per_unit": Decimal(cost)},
            )
            StockItem.objects.get_or_create(
                ingredient=ing,
                defaults={"quantity": Decimal("20"), "threshold_low": Decimal("5")},
            )
            result[name] = ing
        return result

    def _seed_dishes(self, cats: dict[str, Category], ings: dict[str, Ingredient]):
        for name, cat_name, price, desc, prep in DISHES:
            dish, created = Dish.objects.get_or_create(
                name=name,
                defaults={
                    "category": cats[cat_name],
                    "price": Decimal(price),
                    "description": desc,
                    "prep_time": prep,
                },
            )
            if created or not dish.dish_ingredients.exists():
                picks = list(ings.values())[: 3 + (len(name) % 3)]
                for ing in picks:
                    DishIngredient.objects.get_or_create(
                        dish=dish,
                        ingredient=ing,
                        defaults={"quantity": Decimal("0.200")},
                    )

    def _seed_tables(self):
        for number, capacity in TABLES:
            Table.objects.get_or_create(number=number, defaults={"capacity": capacity})
