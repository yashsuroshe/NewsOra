# NewsOra 🗞️

> AI Real-Time News Intelligence & Personal Briefing Companion

NewsOra delivers personalized, real-time news briefings powered by multi-agent AI, RAG (Retrieval-Augmented Generation), and live data sources — built entirely on free-tier infrastructure.

---

## Architecture

```
Google News RSS / GNews / Tavily
        ↓
  Ingestion Worker (BullMQ)
  fetch → extract → enrich (LLM) → embed → cluster
        ↓
  MongoDB Atlas + Atlas Vector Search
        ↓
  Agent Worker (LangGraph)
  relevance → impact → briefing → alert
        ↓
  Express API ← React Frontend
  (auth, chat/RAG, briefings, alerts)
        ↓
  Socket.io push + SSE streaming
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js 20 + Express + TypeScript |
| AI Orchestration | LangGraph.js + LangChain.js |
| LLM Providers | Groq (Llama 3.x) → Gemini 2.5 Flash |
| Embeddings | Gemini embedding-001 (768 dims) |
| Database | MongoDB Atlas M0 (free) |
| Vector Search | Atlas Vector Search |
| Cache / Queue | Upstash Redis + BullMQ |
| Real-time | Socket.io + SSE |
| DevOps | Docker Compose + GitHub Actions |

## Getting Started

### Prerequisites
- Node.js ≥ 20
- Docker & Docker Compose (for local MongoDB + Redis)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/newsora.git
cd newsora

# 2. Copy env template and fill in your API keys
cp .env.example server/.env

# 3. Install dependencies
npm install

# 4. Start local infrastructure (MongoDB + Redis)
docker compose up mongodb redis -d

# 5. Start the API server
npm run dev:server

# 6. Start the React client (new terminal)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173)

### API Keys Required (all free)
- [Groq](https://console.groq.com/) — Fast LLM inference
- [Google Gemini](https://aistudio.google.com/) — Embeddings + LLM fallback
- [MongoDB Atlas](https://mongodb.com/atlas) — M0 free cluster
- [Upstash](https://upstash.com/) — Free Redis
- [GNews](https://gnews.io/) — News API (optional)
- [Tavily](https://tavily.com/) — Search API (optional)
- [Google Cloud](https://console.cloud.google.com/) — OAuth (optional)

## Development Phases

- [x] Part 1: Monorepo scaffold
- [ ] Part 2: Express middleware stack
- [ ] Part 3: MongoDB models
- [ ] Part 4: Auth (email/password)
- [ ] Part 5: Google OAuth
- [ ] Part 6: User preferences
- [ ] ...and more

## License

MIT
