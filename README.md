# MangerManger — ERP Restaurant

ERP léger pour restaurant (Back-Office Gérant, Front-Office Équipe, Portail Client).
Voir [`BUILD.md`](./BUILD.md) pour le plan complet.

## Stack
Django 5 · DRF · PostgreSQL · Redis · Celery · React 18 · Vite · TypeScript · Tailwind.

## Démarrage

```bash
cp .env.example .env
docker-compose up --build
```

- Frontend : http://localhost:5173
- API : http://localhost:8000/api/
- Swagger : http://localhost:8000/api/docs/
- Admin Django : http://localhost:8000/admin/

## Tests

```bash
# Backend
docker-compose exec backend pytest

# Frontend
docker-compose exec frontend npm test
```

## Commandes utiles

```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py seed  # Phase 1+
```



💡 Useful Commands for you:
If you need to stop or restart the project in the future, you can now use these without sudo (after a logout/login or using sg docker):

Start everything: docker compose up -d
Stop everything: docker compose down
View logs: docker compose logs -f
Create a new superuser: docker compose exec backend python manage.py createsuperuser# mangermanger
