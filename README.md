# MangerManger

**MangerManger** is a full-stack restaurant ERP that connects every role in a dining establishment — manager, waitstaff, kitchen, and customer — through a single web platform.

It ships with a built-in **AI sentiment analysis engine** that automatically classifies customer reviews (positive / neutral / negative) using a fine-tuned XLM-RoBERTa model, and a **hybrid recommendation engine** that personalises dish suggestions for each customer.

---

## Features

### Back-Office (Manager)
- Full menu management — dishes, categories, ingredients & stock levels
- Real-time analytics dashboard — revenue, order volume, sentiment trends
- Staff management with role-based access (Manager / Waiter / Chef / Customer)
- Reservation management

### Salle / Cuisine (Waiter & Chef)
- Waiter-facing order entry with live table plan
- Kitchen Display System (KDS) — orders flow instantly from waiter to chef
- Order status tracking (Draft → Sent → Preparing → Ready → Served → Paid)

### Customer Portal
- Online table reservation
- Browse the menu with real-time availability
- Leave reviews — automatically analysed by XLM-RoBERTa asynchronously
- Personalised dish recommendations (hybrid content-based + collaborative filtering)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 · Django 5 · Django REST Framework |
| Database | PostgreSQL 15 |
| Task Queue | Celery + Redis |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| NLP / AI | PyTorch 2.3 · HuggingFace Transformers 4.40 (XLM-RoBERTa) |
| ML | Scikit-Learn 1.4 · NLTK 3.8 |
| Auth | JWT (SimpleJWT) |
| Docs | drf-spectacular (OpenAPI 3) |
| Containerisation | Docker · Docker Compose |

---

## Recommendation Engine

The engine is hybrid and runs without heavy ML dependencies at import time:

1. **Content-based** — Jaccard similarity on dish features (ingredients + category + description tokens)
2. **Collaborative filtering** — cosine user similarity built from explicit ratings and implicit order history
3. **Cold-start fallback** — popularity score weighted by `avg_rating + (positive_reviews − negative_reviews) / 10`, where sentiment labels come from XLM-RoBERTa

---

## Sentiment Analysis Pipeline

Customer reviews are analysed asynchronously — the API returns immediately and the classification runs in the background:

```
POST /api/reviews/
    → Django post_save signal
    → Celery task (via Redis)
    → HuggingFaceAnalyzer (XLM-RoBERTa) or KeywordAnalyzer (dev/test fallback)
    → UPDATE review.sentiment + review.sentiment_score
```

**Model comparison results on the test set:**

| Model | Accuracy | F1-Score |
|---|---|---|
| Naive Bayes | 78.4 % | 78.1 % |
| Logistic Regression | 82.7 % | 82.5 % |
| Random Forest | 84.1 % | 83.8 % |
| SVM (TF-IDF) | 86.3 % | 86.4 % |
| LSTM | 89.2 % | 89.4 % |
| **XLM-RoBERTa** | **92.5 %** | **92.5 %** |

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev only)

### Run with Docker

```bash
git clone https://github.com/<your-username>/mangermanger.git
cd mangermanger

cp .env.example .env          # fill in your values
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| REST API | http://localhost:8000/api/ |
| Swagger / OpenAPI | http://localhost:8000/api/docs/ |
| Django Admin | http://localhost:8000/admin/ |

### Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
python manage.py migrate
python manage.py runserver

# Celery worker (separate terminal)
celery -A mangermanger worker -l info

# Frontend
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
mangermanger/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # User model, JWT auth, roles
│   │   ├── menu/            # Dishes, categories, ingredients
│   │   ├── orders/          # Orders, order items, table management
│   │   ├── reservations/    # Table reservations
│   │   ├── reviews/         # Reviews + async sentiment analysis
│   │   └── recommendations/ # Hybrid recommendation engine
│   ├── mangermanger/        # Django settings & URL config
│   ├── tests/               # Pytest test suite
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── features/        # Feature-based modules
│       ├── components/      # Shared UI components
│       └── routes/          # Page routes
├── diagrams/                # UML source files (.puml)
├── docker-compose.yml
└── .env.example
```

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list. Key variables:

```env
DJANGO_SECRET_KEY=...
POSTGRES_DB=mangermanger
POSTGRES_USER=mangermanger
POSTGRES_PASSWORD=...
REDIS_URL=redis://redis:6379/0
SENTIMENT_MODEL_ENABLED=true   # set false to use keyword fallback
VITE_API_URL=http://localhost:8000/api
```

---

## Running Tests

```bash
cd backend
pytest
```

---

## Authors

- **Elmehdi Bellaoud**
- **Marzoug Adam**

Supervised by **Mme. Bensalah Nouhaila** — EMSI Rabat, 2025–2026
