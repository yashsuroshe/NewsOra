# NewsOra 📰🤖

> **AI-powered personal news intelligence platform** — real-time briefings, RAG-powered chat, and smart alerts. Built entirely on free-tier services.

[![CI](https://github.com/YOUR_USERNAME/newsora/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/newsora/actions/workflows/ci.yml)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗞️ **Multi-source ingestion** | Google News RSS + GNews + Tavily, deduplicated by SHA-256 URL hash |
| 🤖 **LLM enrichment** | Groq (llama-3.1-8b-instant) → Gemini fallback: summary, topics, importance, entities |
| 🔍 **Hybrid search** | Atlas Vector Search (semantic) + MongoDB text search (keyword) |
| 💬 **RAG chat** | SSE streaming with source citations — ask anything about recent news |
| 📰 **LangGraph briefings** | 4-node multi-agent pipeline: collect → filter → analyze → write |
| 🔔 **Real-time alerts** | Socket.io push alerts for high-importance (≥8) breaking news |
| 🔐 **Dual auth** | Email/password + Google OAuth, JWT rotation + refresh token family revocation |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React + Vite)                   │
│  Login / Register │ Dashboard │ Chat (SSE) │ Preferences     │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + SSE + Socket.io
┌──────────────────────────▼──────────────────────────────────┐
│                   API Server (Express + TS)                   │
│  Auth │ Articles │ Chat │ Briefings │ Alerts │ Preferences   │
└────────┬─────────────────────┬────────────────┬─────────────┘
         │                     │                │
  ┌──────▼──────┐    ┌─────────▼──────┐  ┌─────▼──────┐
  │  MongoDB     │    │ Upstash Redis  │  │ Atlas Vector│
  │  (M0 Free)  │    │ (BullMQ queues)│  │  Search     │
  └─────────────┘    └────────────────┘  └────────────┘
         │
  ┌──────▼──────────────────────────────────────┐
  │  Workers (BullMQ)                            │
  │  ┌─────────────────┐  ┌──────────────────┐  │
  │  │ Ingestion Worker │  │  Agent Worker    │  │
  │  │ RSS+GNews+Tavily │  │  LangGraph       │  │
  │  │ → Enrich → Embed │  │  Briefing Agent  │  │
  │  └─────────────────┘  └──────────────────┘  │
  └─────────────────────────────────────────────┘
```

**3-process model:** `api` · `ingestion-worker` · `agent-worker`

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas M0 (free) — [atlas.mongodb.com](https://atlas.mongodb.com)
- Upstash Redis (free) — [upstash.com](https://upstash.com)

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/newsora.git
cd newsora
npm install          # installs all workspaces
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys (see below)
```

### 3. Start (Docker — easiest)

```bash
docker compose up
```

Runs: API on `:4000`, Client on `:5173`, MongoDB on `:27017`, Redis on `:6379`.

### 4. Start (manual)

```bash
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — Ingestion worker
cd server && npm run dev:worker:ingest

# Terminal 3 — Agent worker
cd server && npm run dev:worker:agent

# Terminal 4 — Frontend
cd client && npm run dev
```

---

## 🔑 Environment Variables

All variables in one `.env` at the project root. Server reads from `server/.env` (copy the same file).

### Required

| Variable | Where to get it | Notes |
|---|---|---|
| `MONGODB_URI` | [MongoDB Atlas](https://atlas.mongodb.com) | Free M0 cluster |
| `REDIS_URL` | [Upstash](https://upstash.com) | Free 256MB |
| `JWT_SECRET` | Generate: `openssl rand -hex 32` | ≥32 chars |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -hex 32` | ≥32 chars |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Free 14.4K RPD |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | Free tier |
| `CLIENT_URL` | `http://localhost:5173` | |
| `CORS_ORIGINS` | `http://localhost:5173` | |

### Optional (enable more news sources)

| Variable | Where to get it | Free limit |
|---|---|---|
| `GNEWS_API_KEY` | [gnews.io](https://gnews.io) | 100 req/day |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) | 1,000 req/month |
| `GOOGLE_CLIENT_ID` | [Google Console](https://console.cloud.google.com) | — |
| `GOOGLE_CLIENT_SECRET` | Google Console | — |

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register with email + password |
| POST | `/api/v1/auth/login` | — | Login, returns JWT + sets cookie |
| POST | `/api/v1/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| GET | `/api/v1/auth/me` | Bearer | Get current user |
| GET | `/api/v1/auth/google` | — | Initiate Google OAuth |

### Articles

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/articles` | Paginated feed `?page=1&limit=20&topics=AI,Tech` |
| GET | `/api/v1/articles/search` | Hybrid search `?q=quantum+computing&maxResults=10` |
| GET | `/api/v1/articles/:id` | Get article by ID |

### Chat (SSE Streaming)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/chat/conversations` | Create conversation |
| GET | `/api/v1/chat/conversations` | List conversations |
| GET | `/api/v1/chat/conversations/:id/messages` | Get messages |
| POST | `/api/v1/chat/conversations/:id/stream` | **SSE stream** — body: `{query, topics?}` |
| DELETE | `/api/v1/chat/conversations/:id` | Delete with cascade |

**SSE event format:**
```
data: {"type":"token","content":"..."}
data: {"type":"done","sources":[{"title":"...","url":"...","source":"..."}]}
data: {"type":"error","message":"..."}
```

### Briefings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/briefings/generate` | Generate now `{type:"daily"\|"weekly"}` |
| GET | `/api/v1/briefings` | List briefing history |
| GET | `/api/v1/briefings/:id` | Get single briefing |

### Preferences

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/preferences` | Get preferences + available topics |
| PUT | `/api/v1/preferences` | Replace `{topics, frequency, alertThreshold}` |
| POST | `/api/v1/preferences/topics` | Add topic `{topic}` |
| DELETE | `/api/v1/preferences/topics/:topic` | Remove topic |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/alerts` | List alerts with unread count |
| PATCH | `/api/v1/alerts/:id/read` | Mark one as read |
| PATCH | `/api/v1/alerts/read-all` | Mark all as read |

---

## 🧪 Testing

```bash
cd server
npm test              # Run all unit tests (vitest)
npx tsc --noEmit      # Typecheck only
```

**Test coverage:**
- Auth service (10 tests)
- Preferences service (7 tests)
- News fetcher + dedup (10 tests)
- LLM enricher (3 tests)
- Text chunker (5 tests)
- Conversation service (4 tests)

---

## 🐳 Docker Deployment

### Development

```bash
docker compose up
```

### Production build

```bash
# Build production images
docker build -t newsora-api --target production ./server
docker build -t newsora-client --target production \
  --build-arg VITE_API_URL=https://your-api.com/api/v1 ./client
```

---

## 🗄️ Database Setup

### Atlas Vector Search Index

Run once after first deployment:

```bash
cd server
MONGODB_URI=<your-atlas-uri> npx tsx src/scripts/create-vector-index.ts
```

This creates the HNSW index on `VectorChunk.embedding` (768 dims, cosine similarity).

---

## 📁 Project Structure

```
newsora/
├── client/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # ProtectedRoute
│   │   ├── layouts/          # AppLayout (sidebar + Socket.io alerts)
│   │   ├── lib/              # Axios instance (auto-refresh)
│   │   ├── pages/            # Login, Register, Dashboard, Chat, Preferences
│   │   └── stores/           # Zustand auth store
│   └── Dockerfile
├── server/                   # Express + TypeScript
│   ├── src/
│   │   ├── agents/           # LangGraph briefing pipeline
│   │   ├── config/           # Zod env validation, feeds, passport
│   │   ├── controllers/      # HTTP handlers
│   │   ├── middleware/        # auth, validate, rateLimit, error
│   │   ├── models/           # 8 Mongoose models
│   │   ├── queues/           # BullMQ queue definitions
│   │   ├── routes/           # Express routers
│   │   ├── services/
│   │   │   ├── auth/         # JWT rotation + family revocation
│   │   │   ├── chat/         # RAG chat + conversation history
│   │   │   ├── ingestion/    # RSS + GNews + Tavily + enricher
│   │   │   └── rag/          # Chunker + embedder + hybrid search
│   │   ├── sockets/          # Socket.io server
│   │   └── workers/          # Ingestion + agent worker entry points
│   └── Dockerfile
├── .github/workflows/ci.yml  # GitHub Actions CI
├── docker-compose.yml        # Full local dev stack
└── .env.example              # Environment variable template
```

---

## 🆓 Free Tier Usage Summary

| Service | Tier | Limit |
|---|---|---|
| MongoDB Atlas | M0 | 512 MB storage, 3 search indexes |
| Upstash Redis | Free | 256 MB, 10K commands/day |
| Groq API | Free | 14,400 RPD, llama-3.1-8b-instant |
| Gemini API | Free | 1,500 RPM embedding, 15 RPM generate |
| GNews | Free | 100 requests/day |
| Tavily | Free | 1,000 requests/month |

**Total monthly cost: \$0** 🎉

---

## 📄 License

MIT
