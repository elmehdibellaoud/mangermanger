# BUILD.md — MangerManger ERP Restaurant

**Projet** : ERP léger pour la gestion complète d'un restaurant (Back-Office Gérant, Front-Office Employés, Portail Client).
**Type** : Projet de Fin d'Année (PFA).
**Stack** : Django REST Framework + React (Vite + TypeScript) + PostgreSQL + Redis.

---

## 🎯 Objectifs globaux

Construire une application web complète avec 3 portails distincts :

1. **Back-Office (Gérant)** — Menu, stocks, RH, tableau de bord.
2. **Front-Office (Employés)** — Interface serveur (tables/commandes) et cuisinier (KDS).
3. **Portail Client** — Menu public, réservation, compte, avis, recommandations.

Un **système de recommandation intelligent** est au cœur du portail client (hybride content-based + collaborative filtering).

---

## 🧱 Stack technique

### Backend
- **Django 5.x** + **Django REST Framework**
- **djangorestframework-simplejwt** (auth JWT)
- **PostgreSQL 16** (base principale)
- **Redis 7** (cache + queue Celery)
- **Celery** (tâches asynchrones : emails, recalcul recommandations)
- **Pillow** (images plats)
- **django-cors-headers**, **drf-spectacular** (OpenAPI)
- **scikit-learn** + **pandas** + **numpy** (moteur de recommandation)
- **transformers** + **torch** (analyse de sentiment via Hugging Face)
- **pytest-django** + **factory-boy** (tests)

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **React Router v6**
- **TanStack Query** (data fetching)
- **Zustand** (state global léger)
- **Axios** (HTTP client, interceptor JWT)
- **TailwindCSS** + **shadcn/ui** (UI components)
- **Recharts** (graphiques dashboard)
- **React Hook Form** + **Zod** (formulaires)
- **Vitest** + **Testing Library** (tests)

### DevOps
- **Docker** + **docker-compose** (dev + prod)
- **.env** pour toutes les secrets
- **GitHub Actions** (CI : lint + tests)

---

## 📁 Structure du projet

```
mangermanger/
├── backend/
│   ├── mangermanger/          # config Django
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   └── prod.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── accounts/          # Users, roles, auth
│   │   ├── menu/              # Dishes, categories, ingredients
│   │   ├── stock/             # Inventaire, mouvements
│   │   ├── orders/            # Commandes, tables, KDS
│   │   ├── reservations/      # Réservations clients
│   │   ├── hr/                # Plannings, offres emploi
│   │   ├── reviews/           # Avis clients
│   │   ├── promotions/        # Codes promo, fidélité
│   │   ├── recommendations/   # Moteur IA
│   │   └── dashboard/         # KPIs et analytics
│   ├── requirements.txt
│   ├── manage.py
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios clients
│   │   ├── components/        # UI réutilisables
│   │   ├── features/
│   │   │   ├── admin/         # Back-Office
│   │   │   ├── staff/         # Serveur + Cuisinier
│   │   │   └── client/        # Portail public
│   │   ├── hooks/
│   │   ├── store/             # Zustand
│   │   ├── routes/
│   │   └── main.tsx
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── README.md
└── BUILD.md
```

---

## 🚀 Phase 0 — Setup initial

### Objectifs
Mettre en place l'environnement de dev complet, fonctionnel en une commande `docker-compose up`.

### Tâches
1. Créer la structure de dossiers ci-dessus.
2. Initialiser Django : `django-admin startproject mangermanger backend/`.
3. Splitter `settings.py` en `base.py` / `dev.py` / `prod.py`.
4. Installer et configurer : DRF, SimpleJWT, CORS, drf-spectacular, Celery.
5. Initialiser React + Vite + TypeScript + Tailwind + shadcn/ui.
6. Configurer `docker-compose.yml` avec 4 services : `db` (Postgres), `redis`, `backend`, `frontend`.
7. Créer `.env.example` avec toutes les variables.
8. Configurer `pytest.ini` (backend) et `vitest.config.ts` (frontend).
9. CI GitHub Actions : lint (ruff + eslint) + tests.

### Critères d'acceptation
- `docker-compose up` démarre tout sans erreur.
- `http://localhost:8000/api/docs/` affiche Swagger (vide).
- `http://localhost:5173` affiche la page React par défaut.
- `pytest` et `npm test` s'exécutent avec 0 tests mais sans erreur.

---

## 🗄️ Phase 1 — Modèles de données + Django Admin

### Objectifs
Définir tous les modèles métier et les exposer dans Django Admin pour seeding initial.

### Modèles (par app)

#### `accounts`
```python
User(AbstractUser)  # email unique, role: CLIENT|SERVEUR|CUISINIER|GERANT
Profile  # phone, address, birth_date, avatar
```

#### `menu`
```python
Category      # name, slug, display_order
Ingredient    # name, unit (kg|L|unit), cost_per_unit
Dish          # name, description, price, category(FK), image, is_available, prep_time
DishIngredient  # dish(FK), ingredient(FK), quantity
```

#### `stock`
```python
StockItem     # ingredient(FK, OneToOne), quantity, threshold_low, last_updated
StockMovement # ingredient, type(IN|OUT|ADJUST), quantity, reason, created_at, created_by
```

#### `orders`
```python
Table         # number, capacity, status(FREE|OCCUPIED|RESERVED)
Order         # table(FK nullable), client(FK nullable), server(FK), status(DRAFT|SENT|PREPARING|READY|SERVED|PAID), total, created_at
OrderItem     # order(FK), dish(FK), quantity, unit_price, notes, status(PENDING|PREPARING|READY|SERVED)
```

#### `reservations`
```python
Reservation   # client(FK), date, time, guests, table(FK nullable), status(PENDING|CONFIRMED|CANCELLED), notes
```

#### `hr`
```python
Schedule      # employee(FK User), date, shift_start, shift_end, role
JobOffer      # title, description, requirements, is_active, created_at
JobApplication  # offer(FK), candidate_name, email, cv(FileField), status
```

#### `reviews`
```python
Review        # client(FK), dish(FK), rating(1-5), comment, created_at, is_approved
              # + sentiment(POSITIVE|NEGATIVE|NEUTRAL), sentiment_score(float 0-1), analyzed_at
```

#### `promotions`
```python
PromoCode     # code, type(PERCENT|FIXED), value, min_order, max_uses, used_count, expires_at, is_active
LoyaltyAccount  # client(FK OneToOne), points, total_spent
```

### Tâches
1. Créer toutes les migrations et les exécuter.
2. Enregistrer tous les modèles dans Django Admin avec `list_display`, `search_fields`, `list_filter`.
3. Créer un script `seed.py` (commande Django) qui peuple : 3 catégories, 15 plats, 20 ingrédients, 10 tables, 5 utilisateurs (1 gérant, 2 serveurs, 1 cuisinier, 1 client).
4. Tests : vérifier contraintes (ex : `User.email unique`, `Dish.price > 0`, `Reservation.guests > 0`).

### Critères d'acceptation
- Django Admin accessible à `/admin/` avec tous les modèles éditables.
- `python manage.py seed` peuple la base correctement.
- Tests unitaires des modèles passent (au moins 1 test par contrainte critique).

---

## 🏢 Phase 2 — Back-Office Gérant

### Objectifs
Interface admin complète pour le gérant : menu, stocks, RH, dashboard.

### Endpoints API (DRF ViewSets)
Tous sous `/api/admin/*`, permission `IsGerant`.

- `GET/POST /categories/` + `/{id}/` (PUT, DELETE)
- `GET/POST /dishes/` + `/{id}/` — avec upload image (multipart)
- `GET/POST /ingredients/`
- `GET /stock/` — liste avec alertes (flag `is_low`)
- `POST /stock/movements/` — entrée marchandise
- `GET/POST /employees/` — CRUD users avec rôle
- `GET/POST /schedules/` — plannings par semaine
- `GET/POST /job-offers/` + `GET /job-applications/`
- `GET /dashboard/stats/` — revenue (7j/30j/year), top dishes, orders count
- `GET /dashboard/reviews/` — derniers avis

### Frontend — `features/admin/`
Routes :
- `/admin` → redirect vers `/admin/dashboard`
- `/admin/dashboard` → KPI cards + Recharts (line chart revenue, bar chart top plats)
- `/admin/menu` → table CRUD plats + modal création/édition avec upload image
- `/admin/menu/categories` → CRUD catégories
- `/admin/stock` → table ingrédients + badge rouge si `is_low` + modal "Entrée de marchandise"
- `/admin/staff` → liste employés + création + attribution rôle
- `/admin/staff/schedules` → calendrier hebdo (drag & drop optionnel)
- `/admin/jobs` → CRUD offres + consultation candidatures
- `/admin/reviews` → modération avis (approve/reject) + **badge sentiment** (vert POSITIVE / rouge NEGATIVE / gris NEUTRAL) + score % + **filtres par sentiment** + **mini-dashboard** : ratio pos/neg par plat, graphe évolution sentiment sur 30j (Recharts)

### Composants clés
- `<StatCard>` (KPI avec variation %)
- `<DataTable>` (générique, tri, pagination, recherche)
- `<DishForm>` (formulaire plat avec upload image + sélection ingrédients)
- `<StockLowBanner>` (alerte globale)

### Tests
- Backend : permissions (un serveur ne peut pas accéder à `/api/admin/*`).
- Backend : calcul `dashboard/stats` correct.
- Frontend : rendu table plats, soumission formulaire création plat.

### Critères d'acceptation
- Gérant peut créer un plat avec image et ingrédients en < 30s.
- Dashboard affiche vrais KPIs à partir de la seed.
- Alerte stock bas visible dès qu'un ingrédient passe sous le seuil.

---

## 🍳 Phase 3 — Front-Office Employés

### 3.A — Interface Serveur

#### Endpoints
- `GET /api/staff/tables/` — plan de salle avec statuts
- `POST /api/staff/orders/` — créer commande (table_id)
- `POST /api/staff/orders/{id}/items/` — ajouter plats
- `PATCH /api/staff/orders/{id}/send/` — envoyer en cuisine (passe status à `SENT`)
- `PATCH /api/staff/orders/{id}/pay/` — marquer payée

#### Frontend
- `/staff/tables` — grille des tables (vert libre, rouge occupée, orange réservée)
- `/staff/tables/{id}` — prise de commande : menu à gauche, ticket à droite, bouton "Envoyer en cuisine"
- `/staff/orders` — toutes les commandes du serveur connecté

### 3.B — Interface Cuisinier (KDS)

#### Endpoints
- `GET /api/staff/kds/orders/` — commandes actives (status `SENT` ou `PREPARING`)
- `PATCH /api/staff/kds/items/{id}/ready/` — marquer un plat prêt

#### Frontend
- `/staff/kds` — écran plein écran, colonnes par statut (Nouvelles / En préparation / Prêtes)
- Auto-refresh toutes les 5s (TanStack Query `refetchInterval`)
- Son de notification sur nouvelle commande (`<audio>`)

### Tests
- Flux complet : serveur crée commande → envoie → cuisinier marque prêt → serveur marque servi.
- WebSocket (optionnel si temps) ou polling 5s.

### Critères d'acceptation
- Un serveur prend une commande de 3 plats et l'envoie en cuisine en < 1min.
- Le cuisinier voit la commande apparaître en < 6s (polling).
- Marquer un plat prêt met à jour l'écran serveur au refresh suivant.

---

## 🌐 Phase 4 — Portail Client

### Endpoints publics (pas d'auth requise pour consultation)
- `GET /api/public/menu/` — menu complet groupé par catégorie
- `GET /api/public/dishes/{id}/` — détail plat + avis
- `POST /api/public/reservations/` — réservation (peut être anonyme avec email)
- `GET /api/public/availability/?date=X&time=Y&guests=Z` — tables dispo

### Endpoints authentifiés (client connecté)
- `POST /api/auth/register/` + `/api/auth/login/`
- `GET /api/client/profile/` + `PATCH`
- `GET /api/client/orders/` — historique
- `GET /api/client/reservations/`
- `POST /api/client/reviews/` — laisser avis (sur plat commandé uniquement)
- `GET /api/client/recommendations/` — **voir Phase 5**
- `POST /api/client/promo/validate/` — vérifier code

### Frontend — `features/client/`
- `/` → landing (hero + plats populaires + CTA réserver)
- `/menu` → menu public avec filtres par catégorie + recherche
- `/menu/:id` → détail plat + avis + "Plats similaires" (reco)
- `/reservation` → formulaire (date, heure, nb personnes) + confirmation
- `/login` + `/register`
- `/account` → profil + historique commandes + historique réservations + mes avis
- `/account/recommendations` → **"Pour vous"** (reco personnalisées)

### Tests
- Réservation anonyme possible.
- Un client ne peut pas laisser d'avis sur un plat non commandé.
- JWT refresh automatique côté frontend (interceptor Axios).

### Critères d'acceptation
- Un client peut réserver une table en 3 clics depuis la home.
- Le menu public est consultable sans login.
- Un client connecté voit son historique complet.

---

## 🧠 Phase 5 — IA / Machine Learning

Cette phase regroupe **deux modules IA** indépendants : analyse de sentiment des avis (A) + moteur de recommandation (B).

---

### Phase 5.A — Analyse de sentiment des avis (Hugging Face)

#### Objectifs
Analyser automatiquement chaque avis client soumis pour déterminer si le sentiment est **positif**, **négatif** ou **neutre**, et afficher les résultats au gérant dans le Back-Office.

#### Choix du modèle
- **Principal** : `cardiffnlp/twitter-xlm-roberta-base-sentiment` (multilingue — FR/EN/AR/ES, sortie : `positive`/`neutral`/`negative` + score confiance).
- **Alternative légère** : `nlptown/bert-base-multilingual-uncased-sentiment` (sortie 1-5 étoiles → mappable en pos/neu/neg).
- **Fallback ultra-léger** : **TextBlob** pour textes anglais uniquement (utile si les ressources serveur sont limitées).

#### Implémentation — app `reviews/sentiment.py`

```python
from transformers import pipeline

class SentimentAnalyzer:
    _pipeline = None

    @classmethod
    def get_pipeline(cls):
        if cls._pipeline is None:
            cls._pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                tokenizer="cardiffnlp/twitter-xlm-roberta-base-sentiment",
            )
        return cls._pipeline

    @classmethod
    def analyze(cls, text: str) -> dict:
        """Retourne {'sentiment': 'POSITIVE'|'NEGATIVE'|'NEUTRAL', 'score': 0.94}"""
        result = cls.get_pipeline()(text[:512])[0]  # tronquer à 512 tokens
        label_map = {"positive": "POSITIVE", "negative": "NEGATIVE", "neutral": "NEUTRAL"}
        return {
            "sentiment": label_map[result["label"].lower()],
            "score": round(result["score"], 3),
        }
```

#### Déclenchement
- **Automatique via signal Django** (`post_save` sur Review) → tâche Celery `analyze_review_sentiment(review_id)` → remplit les champs `sentiment`, `sentiment_score`, `analyzed_at`.
- **Manuel (admin)** : bouton "Relancer l'analyse" sur un avis.

#### Endpoints
- `POST /api/client/reviews/` — création avis → déclenche analyse async (réponse immédiate, sentiment calculé en background).
- `GET /api/admin/reviews/?sentiment=NEGATIVE` — filtrage par sentiment.
- `GET /api/admin/reviews/sentiment-stats/` — stats globales (nb pos/neu/neg, répartition par plat, évolution 30j).
- `POST /api/admin/reviews/{id}/reanalyze/` — relancer analyse.

#### Frontend
- **Composant de démo standalone** (exigence du prof) : page `/admin/sentiment-playground` avec un **textarea** + un bouton **"Analyser"** → appelle `POST /api/admin/sentiment/predict/` avec `{text}` → affiche le résultat `POSITIVE 94%` en badge coloré. ✅ Coche l'exigence "petite application Python avec zone de texte + bouton + modèle DL/ML".
- **Page Reviews** (`/admin/reviews`) : badge sentiment coloré, filtres, mini-dashboard.

#### Optimisations
- Modèle chargé **une seule fois** au démarrage du worker Celery (singleton).
- Cache Redis des résultats par hash du texte (`reco:sent:{md5}`) pour éviter ré-analyse.
- Worker Celery dédié pour les tâches ML (file `ml_queue`).

#### Tests
- Analyse d'un texte "J'ai adoré ce plat !" → `POSITIVE` avec score > 0.8.
- Analyse d'un texte "Service catastrophique" → `NEGATIVE` avec score > 0.8.
- Analyse d'un texte mixte → gestion correcte du `NEUTRAL`.
- Signal post_save déclenche bien la tâche Celery.
- Endpoint `/sentiment-stats/` retourne les bons comptages.

#### Critères d'acceptation
- Chaque nouvel avis reçoit automatiquement un sentiment en < 5s (async).
- Dashboard admin affiche un ratio pos/neg par plat (utile pour identifier les plats à retirer).
- Le "playground" standalone fonctionne et peut être démontré seul au jury.

---

### Phase 5.B — Moteur de recommandation de plats

#### Objectifs
Recommander des plats personnalisés à chaque client, basé sur son historique et des similarités de contenu.

#### Approche hybride

##### A. Content-Based (TF-IDF + Cosine)
- Vectoriser chaque plat à partir de : `name + description + category + ingredients`.
- `scikit-learn TfidfVectorizer` → matrice de similarité cosinus plat↔plat.
- Usage : sur une page de détail plat → "Plats similaires".

##### B. Collaborative Filtering (User-Item)
- Matrice `users × dishes` avec scores : `rating` explicite (1-5) + `count_orders` implicite (pondéré).
- Factorisation matricielle via `scikit-learn TruncatedSVD` (latent factors = 20).
- Usage : sur `/account/recommendations` → "Pour vous" (top 10 plats non encore commandés).

##### C. Fallback cold-start
- Nouveau client sans historique → top 10 plats les mieux notés globalement.
- **Bonus** : pondérer par le sentiment moyen des avis (pas uniquement la note), pour profiter de Phase 5.A.

#### Implémentation — app `recommendations`

```python
# services.py
class RecommendationEngine:
    def fit(self):
        """Entraîne les deux modèles et sauvegarde les matrices en cache Redis."""
        self._fit_content_based()
        self._fit_collaborative()

    def similar_dishes(self, dish_id, k=5): ...
    def recommend_for_user(self, user_id, k=10): ...
    def popular_fallback(self, k=10): ...
```

##### Tâche Celery périodique
- `recompute_recommendations` toutes les 6h (ou après seuil de nouveaux avis/commandes).
- Matrices stockées en Redis (clé `reco:content:matrix`, `reco:collab:factors`).

##### Endpoints
- `GET /api/public/dishes/{id}/similar/` → content-based
- `GET /api/client/recommendations/` → collaborative (fallback si cold start)

##### Tests
- Matrice de similarité : plat A et plat B partageant 80% des ingrédients → similarité > 0.6.
- User avec 5 commandes italiennes → recommandations contiennent au moins 3 plats italiens.
- Cold start : nouveau user reçoit les top-rated (pondérés par sentiment moyen).

##### Critères d'acceptation
- `/account/recommendations` affiche 10 plats pertinents en < 500ms (lecture Redis).
- Recalcul programmé fonctionne via Celery Beat.

---

## 🎁 Phase 6 — Codes promo + fidélité

### Règles métier
- **PromoCode** : réduction `%` ou `fixe`, validé à l'envoi de commande, décrémente `used_count`.
- **LoyaltyAccount** : 1 point / 10 MAD dépensés, 100 points = -50 MAD sur prochaine commande.

### Endpoints
- `POST /api/client/promo/validate/` → body `{code, order_total}` → réponse `{discount, final_total}`.
- `POST /api/staff/orders/{id}/apply-promo/` → applique à la commande.
- `GET /api/client/loyalty/` → solde de points.

### Frontend
- Ticket de commande (serveur et client) : champ "Code promo" avec validation instantanée.
- Account client : widget "Mes points de fidélité" + historique gains.

### Tests
- Code expiré rejeté.
- Code utilisé max X fois rejeté après dépassement.
- Points crédités automatiquement à `status=PAID`.

### Critères d'acceptation
- Application d'un code promo réduit bien le total affiché en temps réel.
- Client voit ses points augmenter après paiement d'une commande.

---

## 🧪 Phase 7 — Tests, polish, déploiement

### Tests
- **Backend** : couverture pytest > 70% sur la logique métier (orders, reco, promo).
- **Frontend** : tests composants critiques (DishForm, ReservationForm, OrderTicket).
- **E2E** (optionnel, Playwright) : 3 scénarios clés (réservation client, prise commande serveur, flux cuisine).

### Documentation
- `README.md` : quickstart, env vars, commandes Docker.
- Swagger auto-généré via drf-spectacular à `/api/docs/`.
- Schéma ERD (dbdiagram.io ou PlantUML) dans `/docs/erd.png`.

### Polish UX
- Loading states partout (skeletons).
- Empty states (illustrations + CTA).
- Toasts (succès / erreurs) via shadcn/ui `<Toast>`.
- Responsive mobile pour portail client et KDS.

### Déploiement
- **Backend** : Render (Dockerfile) + Postgres managé + Redis managé.
- **Frontend** : Vercel (connecté au repo, build auto).
- **Variables** : `.env.prod` avec secrets (JWT_SECRET, DB_URL, etc.).
- **CORS** en prod : autoriser uniquement le domaine Vercel.
- **Migrations auto** au déploiement via `release command` sur Render.

### Critères d'acceptation finale
- Toutes les phases 1→6 fonctionnelles en production.
- Lighthouse score > 85 sur portail client.
- 0 erreur 500 sur flux complet (réservation → commande → paiement).
- Soutenance possible sur environnement live.

---

## ✅ Checklist de suivi

- [ ] Phase 0 — Setup
- [ ] Phase 1 — Modèles + Admin
- [ ] Phase 2 — Back-Office Gérant
- [ ] Phase 3 — Front-Office Employés
- [ ] Phase 4 — Portail Client
- [ ] Phase 5 — IA (Sentiment + Recommandation)
- [ ] Phase 6 — Promo + Fidélité
- [ ] Phase 7 — Tests + Déploiement

---

## 📝 Notes pour Claude Code

1. **Procède phase par phase.** Ne commence pas Phase N+1 tant que Phase N n'a pas ses critères d'acceptation validés.
2. **Avant chaque phase**, relis cette section et confirme la compréhension.
3. **Commits** : un commit par tâche (`feat(menu): add dish CRUD`, `test(reco): cold-start fallback`).
4. **Branches** : `main` (prod) + `dev` + `feature/phase-N-nom`.
5. **Après chaque phase**, tourne les tests et lance un lint complet avant de marquer OK.
6. **Poser les questions** dès qu'une ambiguïté métier apparaît plutôt qu'inventer.

Bon build 🚀
