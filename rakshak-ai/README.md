# Rakshak AI — Crime Intelligence & Investigation Platform

An AI-powered platform for Indian law enforcement combining case management, ML-based investigation time prediction, RAG-powered legal Q&A, and multi-agent investigation workflows.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network (rakshak-net)         │
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │   Frontend   │────▶│   Backend    │                  │
│  │  nginx:80    │     │  Node:8001   │                  │
│  └──────────────┘     └──────┬───┬──┘                  │
│         ▲                    │   │                       │
│    Browser                   │   │                       │
│                        ┌─────┘   └──────┐               │
│                        ▼                ▼               │
│               ┌──────────────┐  ┌──────────────┐       │
│               │  ML Service  │  │   MongoDB    │       │
│               │ Python:8000  │  │  mongo:27017 │       │
│               └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Services

| Service | Image | Port | Description |
|---|---|---|---|
| `frontend` | nginx:1.27-alpine | 80 | Vite/React SPA served by nginx |
| `backend` | node:20-alpine | 8001 | Express REST API |
| `ml-service` | python:3.11-slim | 8000 | Flask ML + RAG microservice |
| `mongodb` | mongo:7.0 | 27017 | Local MongoDB (optional) |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 24+ (includes Compose v2)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone and configure

```bash
git clone https://github.com/kanishkadubey16/AI-Powered-Crime-Intelligence-Investigation-Platform.git
cd AI-Powered-Crime-Intelligence-Investigation-Platform/rakshak-ai

# Create your environment file
cp .env.example .env
```

Open `.env` and fill in:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/rakshak-ai
JWT_SECRET=your_long_random_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Using local MongoDB instead of Atlas?**
> Comment out `MONGODB_URI` in `.env`. The backend will automatically connect to the `mongodb` container.

### 2. Build and start

```bash
docker compose up --build
```

First build takes 5–10 minutes (downloads base images, installs dependencies, pre-downloads the HuggingFace embedding model).

### 3. Open the app

```
http://localhost
```

---

## ML Model Setup (first run only)

The ML model must be trained before predictions work. After the containers are running:

```bash
# Train the investigation time predictor
docker compose exec ml-service python train.py
```

To index the legal documents for RAG (requires real PDFs in `documents/`):

```bash
docker compose exec ml-service python rag/ingest.py
```

---

## Development (without Docker)

### Backend

```bash
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev            # nodemon on port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Vite on port 5175
```

### ML Service

```bash
cd ml-service
pip install -r requirements.txt
python train.py        # train model first
python app.py          # Flask on port 8000
```

---

## Environment Variables

All variables are read from a single `.env` file in the `rakshak-ai/` directory.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas URI or leave blank for local container |
| `JWT_SECRET` | Yes | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register officer |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Cases
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cases` | List cases (paginated, filterable) |
| POST | `/api/cases` | Create case |
| POST | `/api/cases/upload-fir` | Upload FIR with files |
| GET | `/api/cases/:id` | Get case details |
| PUT | `/api/cases/:id` | Update case |
| PATCH | `/api/cases/:id/status` | Update status |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/analyze-fir` | Gemini FIR analysis |
| POST | `/api/ai/legal-query` | RAG legal Q&A |
| POST | `/api/ai/generate-investigation-report/:caseId` | Multi-agent workflow |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports/generate-pdf` | Generate downloadable PDF |
| GET | `/api/reports` | List reports |

### ML Service (direct)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| POST | `/predict-time` | Predict investigation time |
| POST | `/legal-query` | RAG legal query |

---

## Useful Commands

```bash
# View logs for a specific service
docker compose logs -f backend
docker compose logs -f ml-service

# Restart a single service without rebuilding
docker compose restart backend

# Rebuild and restart one service
docker compose up --build backend

# Open a shell inside a container
docker compose exec backend sh
docker compose exec ml-service bash

# Stop all services
docker compose down

# Stop and remove all volumes (full reset)
docker compose down -v

# Check service health
docker compose ps
```

---

## Volumes

| Volume | Mounted at | Purpose |
|---|---|---|
| `mongodb_data` | `/data/db` | MongoDB data persistence |
| `ml_models` | `/app/models` | Trained model + encoder pkl files |
| `ml_chroma` | `/app/rag/chroma_db` | ChromaDB vector store |
| `backend_uploads` | `/app/uploads` | User-uploaded evidence files |

---

## Project Structure

```
rakshak-ai/
├── backend/
│   ├── ai/agents/          # LangGraph multi-agent workflow
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth, error handling, upload
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── services/           # Gemini, ML, RAG service clients
│   ├── utils/              # PDF generator
│   ├── Dockerfile
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── services/       # Axios API clients
│   │   └── context/        # Auth context
│   ├── Dockerfile
│   └── nginx.conf
├── ml-service/
│   ├── rag/                # RAG pipeline (ingest, retriever, chain)
│   ├── models/             # Trained pkl files (gitignored)
│   ├── datasets/           # Training data
│   ├── app.py              # Flask entry point
│   ├── train.py            # Model training script
│   ├── predict.py          # Inference module
│   └── Dockerfile
├── documents/              # Legal PDFs for RAG ingestion
├── docker-compose.yml
└── .env.example
```
