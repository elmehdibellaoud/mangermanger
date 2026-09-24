import pytest

from apps.accounts.models import Role, User


@pytest.fixture
def gerant(db):
    return User.objects.create_user(
        email="gerant@test.local", password="pw12345!", role=Role.GERANT
    )


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email="client@test.local", password="pw12345!", role=Role.CLIENT
    )
