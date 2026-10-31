# ANCHOR / Engram — Governed, Bi-Temporal, Explainable Memory Engine for AI Agents

> **Track 1: Agentic Memory (PS1) — UNCHARTED 2026 Hackathon (NEXUS x SVNIT Surat)**  
> **Team Shakti-2** | Build Window: 30 Oct 2026, 21:00 IST – 31 Oct 2026, 21:00 IST  
> **Pitch:** Deterministic agentic memory governance combining mathematical trust weighting, bi-temporal validity tracking, and safety abstention over MongoDB Atlas.

---

## 🌐 Live Deployed Endpoints

* **Frontend Dashboard (Cloudflare Workers SPA):** [https://agentic-ai-uncharted.yashiadarsh2020.workers.dev](https://agentic-ai-uncharted.yashiadarsh2020.workers.dev)
* **Backend API (Render Web Service):** [https://agentic-ai-uncharted.onrender.com](https://agentic-ai-uncharted.onrender.com)
* **API Health Check:** [https://agentic-ai-uncharted.onrender.com/api/health](https://agentic-ai-uncharted.onrender.com/api/health)

---

## 🚀 Judge Quick Start (2-Minute Test Script)

### Demo Credentials
* **Account Email:** `demo@anchor.io`
* **Password:** `password123` *(pre-filled with one click on the login screen)*

### Interactive 2-Minute Evaluator Script
1. **Login & Session State:**
   * Open the frontend URL: [https://agentic-ai-uncharted.yashiadarsh2020.workers.dev](https://agentic-ai-uncharted.yashiadarsh2020.workers.dev).
   * Click **"Fill Demo Login & Sign In"** to authenticate via JWT.
2. **Step 1: Test Memory Recall & Incident Triage:**
   * Click **"Simulate Alert"** in the top navigation (simulates an infrastructure alert: `checkout-api database pool timeout`).
   * Submit the query in chat: `How do I resolve the checkout-api DB connection timeout?`
   * **Result:** ANCHOR Governed Agent recommends connection pool expansion (`max_connections: 50`) citing verified operational memory `mem-001`.
3. **Step 2: Test Deployment Invalidation (Temporal Validity):**
   * Click **"Deploy v3.0"** (simulates production release of `checkout-api v3.0` which changes infrastructure dependencies).
   * Submit the exact same query again: `How do I resolve the checkout-api DB connection timeout?`
   * **Result:** ANCHOR Governed Agent **safely abstains** (`🛡️ XYRO101 GOVERNED ABSTENTION`), explicitly noting that the prior fix was invalidated by deployment v3.0.
4. **Step 3: Test Adversarial Injection Defense:**
   * Click **"Poison Test"** in the chat header (attempts to ingest an untrusted note with an injection override).
   * Open **Quarantine Inbox** from the left navigation.
   * **Result:** The adversarial payload is isolated in Quarantine (`Status: Quarantined`) via Guard Rule #1 with an operator review option to Approve or Reject.
5. **Step 4: Inspect Formula Decomposition:**
   * Open **Retrieval Inspector** from the left navigation.
   * Select the latest query run.
   * **Result:** View the real-time score decomposition across `Similarity * Trust * Confidence * Recency * Validity` with plain-language reasoning.

---

## 🏗️ System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │          Frontend (React 18 / Cloudflare SPA)          │
                    │   Chat Agent  •  Inspector  •  Timeline  •  Quarantine  │
                    └──────────────────────────┬─────────────────────────────┘
                                               │ HTTPS / WSS / SSE Proxy
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           ANCHOR Governed Backend Engine (Node / TS)                         │
│                                                                                             │
│   ┌──────────────────────────┐    ┌──────────────────────────┐    ┌─────────────────────┐   │
│   │   Ingestion & Screener   │    │   Trust Ladder & Gates   │    │ Temporal Invalidator│   │
│   │  • PII Masking (Regex)   │───▶│  • Provenance Scoring    │───▶│ • Deployment Sweep  │   │
│   │  • Injection Screener    │    │  • Trust Supremacy Gate  │    │ • Half-Life Decay   │   │
│   └──────────────────────────┘    └──────────────────────────┘    └─────────────────────┘   │
│                                               │                                             │
│                                               ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              Hybrid Retrieval Pipeline                              │   │
│   │   MongoDB Atlas $vectorSearch  +  Atlas $search (Full-Text)  +  RRF Fusion (k=60)   │   │
│   │   Score = Relevance × Source Trust × Confidence × Recency Decay × Validity Status   │   │
│   └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                               │                                             │
│                                               ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                       Deterministic Decision & Abstention Layer                     │   │
│   │   Confidence ≥ 0.25 Floor  •  Conflict Delta < 0.15 Gate  •  Core Constraints Injected   │   │
│   └─────────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────────┬──────────────────────┘
                           │                                           │
                           ▼                                           ▼
          ┌──────────────────────────────────┐        ┌──────────────────────────────────┐
          │      MongoDB Atlas Cluster       │        │          n8n Workflows           │
          │ • memories (vector_index, TTL)   │        │ • WF1: Intelligent Creation      │
          │ • events (append-only audit log) │        │ • WF2: Contextual Retrieval      │
          │ • agent_runs (decision HUD log)  │        │ • WF3: Memory Management (NL)    │
          │ • users (auth & workspace scope) │        │ • WF4: Expiry Sweeper (Cron)     │
          │ • Change streams + 3s poll stream│        │ • Fallback to local TS engine    │
          └──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 📊 Feature Status & Blueprint Verification

| Feature | Description | Status | Verification & Evidence |
| :--- | :--- | :---: | :--- |
| **F1: Governed Write Pipeline** | PII masking, deterministic prompt injection screening, Zod structured extraction, trust supremacy check. | **DONE** | Tested in `backend/tests/isolation.test.ts` & `backend/tests/constraintsAndTypes.test.ts`. |
| **F2: Typed Memory & Tiers** | `semantic`, `episodic`, `procedural`, `constraint`, `preference`, `ephemeral`. Core tier capped at 8 with demotion events. Constraints unconditionally injected. | **DONE** | Tested in `backend/tests/constraintsAndTypes.test.ts`. Verified constraint alters fix without being retrieved. |
| **F3: Hybrid Retrieval & Scoring** | Fused $vectorSearch + $search with RRF ($k=60$). Final score: `sim × trust × conf × recency × validity`. Abstention threshold (<0.25). | **DONE** | `backend/src/repositories/MongoRepository.ts:500-580`. In-memory cosine similarity fallback in memory mode. |
| **F4: Inspector HUD & Audit Log** | Explainability screen showing mathematical decomposition and plain-language reasoning. Append-only event log. | **DONE** | Implemented on `/inspector` route and `InspectorPage.tsx`. |
| **F5: Bi-Temporal Time Travel** | Tracks transaction time (`created_at`) and validity time (`valid_from` to `valid_to`). Chrono-scrubber reconstructs historical state. | **DONE** | Implemented on `/timeline` route and `TimelinePage.tsx`. |
| **F6: Deployment Invalidation** | Service release events invalidate dependent operational memories, setting validity to 0.15. | **DONE** | Triggered via `POST /api/events/deploy` and `handleDeployEvent`. |
| **F7: Quarantine Inbox** | Operator dashboard for reviewing, releasing, or rejecting flagged prompt injections and low-trust overrides. | **DONE** | Implemented on `/quarantine` route and `QuarantinePage.tsx`. |
| **F8: Natural Language Management** | Natural language memory modification commands (`/api/memories/manage`) dispatched to WF3 or local engine. | **DONE** | `aiEngineController.ts:manageMemories`. |
| **F9: 15-Scenario Benchmark Arena** | Deterministic evaluation of 15 production scenarios across None, Naive, and Governed modes. | **DONE** | Executable in web UI and via CLI: `npm run benchmark`. |
| **F10: Multi-Tenant Scoping** | Strict workspace and owner scoping on all database queries. Zero cross-tenant leakage. | **DONE** | Verified in `backend/tests/isolation.test.ts`. |
| **WF1–WF4: n8n Integration** | Automated memory creation, retrieval, management, and expiration workflows with 5-second fallback. | **DONE** | Exported JSON files in `/n8n` directory; wired in `backend/src/services/n8nService.ts`. |
| **Telegram Bot & MCP Server** | External chat bot and Model Context Protocol server. | **DROPPED** | Dropped per blueprint cut-line strategy; approval is performed in dashboard. |

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express, TypeScript, Zod, Pino Logger, Vitest, Supertest, JWT, Bcrypt.js.
* **Frontend:** React 18, Vite, TailwindCSS, Lucide React, Recharts, @xyflow/react.
* **Database & Search:** MongoDB Atlas (M0 / Serverless), Atlas Vector Search (`vector_index`), Atlas Full-Text Search (`search`), MongoDB Change Streams.
* **Orchestration:** n8n (self-hosted workflows WF1–WF4 with HMAC timing-safe auth).
* **Deployment:** Cloudflare Workers (Frontend SPA + proxy router), Render (Backend Node web service).

---

## 🍃 MongoDB Implementation Deep-Dive

1. **Atlas Vector Search (`$vectorSearch`):**
   * Indexed over the `embedding` field using cosine similarity with 384 dimensions (`local` MiniLM) or 1536 dimensions (`openai` text-embedding-3-small).
   * Filtered natively inside Atlas by `workspaceId`, `ownerId`, `visibility`, `status`, and `type`.
2. **Atlas Full-Text Search (`$search`):**
   * Lexical search index over `content` and `attribute_key`.
3. **Reciprocal Rank Fusion (RRF, $k=60$):**
   * Aggregates vector candidates and full-text candidates into a combined rank score: $\text{RRF}(d) = \sum \frac{1}{60 + \text{rank}(d)}$.
4. **TTL Background Expiration:**
   * Compound TTL index on `expires_at: 1` and `purgeAt: 1` (`expireAfterSeconds: 0`) ensures ephemeral memories are automatically purged by MongoDB background workers.
5. **Change Streams & Polling Fallback:**
   * Real-time SSE event pipeline uses MongoDB `eventsCol.watch()`. On free tier clusters where change streams may be restricted, the engine automatically activates a 2-second polling fallback.
6. **ACID Transactions:**
   * Multi-document transactional writes (`repo.ingestTransactional` and `repo.supersedeTransactional`) ensure memory updates and audit events are committed atomically.

---

## ⚡ n8n Orchestration & Direct Fallback

Four production-ready n8n workflows reside in the `/n8n` directory:
* **WF1 — Intelligent Memory Creation (`WF1_memory_creation.json`):** Extracts structured candidate facts, masks PII, screens injection risk, and indexes to MongoDB.
* **WF2 — Contextual Memory Retrieval (`WF2_memory_retrieval.json`):** Executes hybrid query search and computes ANCHOR composite scoring.
* **WF3 — Natural Language Memory Management (`WF3_memory_management.json`):** Parses human instructions (e.g. *"Forget our staging database password"*) into database mutations.
* **WF4 — Temporary Memory Expiration (`WF4_temporary_memory_expiration.json`):** Recurring cron sweeper identifying and demoting expired ephemeral memories.

### Direct Fallback Guarantee
Every n8n dispatch in `backend/src/services/n8nService.ts` implements a 5000ms timeout with timing-safe HMAC authentication. If n8n is offline or unconfigured, the backend seamlessly falls back to the native TypeScript engine with zero user disruption.

---

## 📐 Data Model

### Memory Document (`memories` Collection)
```typescript
interface Memory {
  _id: string;               // e.g. "mem-001"
  id: string;                // Canonical ID
  owner: string;             // User ID (usr-shakti2)
  workspace: string;         // Workspace ID (ws-primary)
  type: MemoryType;          // semantic | episodic | procedural | constraint | preference | ephemeral
  tier: MemoryTier;          // hot | warm | archive
  content: string;           // Scrubbed fact text
  embedding?: number[];      // 384-d or 1536-d float array
  dimension?: number;        // Vector length
  attribute_key: string;     // Canonical ontology key (e.g. "checkout-api.fix.db_timeout")
  value: string;             // Current fact value
  entities: string[];        // Extracted entities
  depends_on: string[];      // Upstream service dependencies (e.g. ["checkout-api"])
  source: {
    kind: SourceKind;        // system_event (0.85) | user_stated (0.80) | unverified (0.40)
    actor: string;           // Provenance actor
  };
  trust: number;             // 0.0 - 1.0
  confidence: number;        // 0.0 - 1.0 (calibrated via outcome feedback)
  status: MemoryStatus;      // active | superseded | stale | quarantined | expired
  valid_from: string;        // ISO timestamp
  valid_to: string | null;   // ISO timestamp (set upon invalidation)
  superseded_by: string | null;
  env_fingerprint: Record<string, any>;
  expires_at: string | null;
  access_count: number;
  last_used_at: string | null;
  created_at: string;
}
```

---

## ⚙️ Environment Variables (Names Only)

```bash
# Server & Environment
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://agentic-ai-uncharted.yashiadarsh2020.workers.dev
STORE=mongo # or 'memory'
EMBED_PROVIDER=local # or 'openai'

# Database
MONGODB_URI=
MONGODB_DB_NAME=anchor

# Authentication & Security
JWT_SECRET=
INTERNAL_API_KEY=
ENGRAM_SHARED_SECRET=

# AI & LLM Providers
GEMINI_API_KEY=
GROQ_API_KEY=
OPENAI_API_KEY=

# n8n Webhook Endpoints (Optional; direct fallback active when omitted)
N8N_WF1_WEBHOOK_URL=
N8N_WF2_WEBHOOK_URL=
N8N_WF3_WEBHOOK_URL=
```

---

## 🧪 Local Setup & Repeatability

```bash
# 1. Clone repository
git clone https://github.com/u25cs009-cmd/Agentic_AI_Uncharted.git
cd Agentic_AI_Uncharted

# 2. Install all dependencies (backend + frontend)
npm run install:all

# 3. Create MongoDB Atlas Search Indexes (if running STORE=mongo)
npm --prefix backend run build
npx tsx backend/src/scripts/createIndexes.ts

# 4. Run the 15-Scenario Benchmark Arena CLI
npm run benchmark

# 5. Run Backend Verification Test Suite (10 suites, 65 tests)
npm test

# 6. Run Frontend Production Build
npm run build:frontend

# 7. Start Backend Server
npm start
```

---

## 📈 Benchmark Methodology & Results

### Naive Baseline Reference Definition
> **Naive Baseline Reference:** Ungoverned vector retrieval performing unweighted cosine similarity matching over raw embedding vectors. It lacks provenance verification, does not apply temporal recency decay, ignores deployment invalidations, and does not detect prompt injections or semantic contradictions.

### Empirical Evaluation Summary
| Metric | Baseline (None) | Naive (Vector Search) | ANCHOR Governed |
| :--- | :---: | :---: | :---: |
| **Correct Action Rate** | 0.0% | 20.0% | **100.0%** (5x improvement) |
| **Harmful Action Rate** | 20.0% | 80.0% | **0.0%** (zero incidents) |
| **Poison Resistance** | 25.0% | 0.0% | **100.0%** (all injections quarantined) |
| **Abstention Precision** | 0.0% | 0.0% | **100.0%** (safe abstention on stale facts) |

---

## 🔒 Security & Provenance Safeguards

* **Timing-Safe Authentication:** Internal webhook calls and n8n dispatches utilize `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
* **Deterministic Guard Rails:** Known prompt injection patterns bypass LLM evaluation and are routed immediately to the Quarantine Inbox.
* **Trust Supremacy:** Unverified or low-trust sources cannot supersede active facts generated by human maintainers or verified system deployment events.
* **Origin-Restricted CORS:** Production backend strictly enforces `FRONTEND_URL` origins and forbids wildcards.

---

## ⚠️ Known Limitations

* **Atlas Search Index Provisioning:** Atlas Vector Search requires a provisioned Search Index on MongoDB Atlas; the repository falls back to in-memory cosine similarity when testing on local MongoDB or M0 without search indexes.
* **Proxy Streaming:** When accessed via Cloudflare Workers free proxy, SSE streams may drop after idle periods; the application includes an automatic 3-second polling fallback with a visual status indicator.
* **Scope Trade-offs:** Telegram bot notifications and MCP server integration were dropped in accordance with the blueprint cut-line strategy; approval is handled directly in the web dashboard.

---

## 📜 Credits & Third-Party Licences

* **MongoDB Node Driver:** Apache License 2.0
* **Express & Zod:** MIT License
* **Lucide React:** ISC License
* **Recharts:** MIT License
* **TailwindCSS:** MIT License
* **Vitest & Supertest:** MIT License

---

## 🤖 AI-Assisted Development Disclosure

In accordance with UNCHARTED 2026 track guidelines, Team Shakti-2 discloses that agentic coding assistants (Antigravity) were utilized during the 24-hour sprint for rapid boilerplate generation, refactoring, and test suite orchestration. All core architectural decisions, data modeling, deterministic safety gates, scoring formulas, and test assertions were authored, reviewed, and verified by the team members.

---

## 📋 Disclosures

* TODO: Team Shakti-2 to confirm any pre-existing boilerplate or components prior to hackathon launch.

---

## 👥 Team Shakti-2 & Contributions

* TODO: Team Shakti-2 members, roles, and individual contribution details.
