# ANCHOR – Detailed Implementation Plan
## Team Shakti-2 | Track 1: Agentic Memory

**Team size:** 3 members  
**Project:** ANCHOR – A Governed, Temporal, Explainable Memory Engine for AI Agents  
**Submission deadline in blueprint:** 10 PM, 31 October  
**Budget & Tooling:** 100% Free Tier & Open Source (No paid APIs, no paid hosting)

---

# 1. Ground Rules & Core Philosophy

1. **Build Order:** Backend first, then UI, and **MongoDB last**. Until the last phase, the backend uses a high-performance in-memory store (plain JavaScript objects, optionally saved to a JSON file).
2. **Free Tools Only:** No paid API, no paid hosting. Free limits change frequently, so verify each provider's dashboard before relying on it during the demo.
3. **Never Commit Keys:** Add `.env` to `.gitignore` before the first commit. All keys must be shared privately among team members.
4. **Cut Line Strategy:** If time runs short, cut strictly from the bottom of the MUST / SHOULD / STRETCH list.
   - **Never Cut:** Governed write path, retrieval with abstention, none/naive/governed mode toggle, n8n W1 to W3 workflows, Retrieval Inspector, benchmark with at least 10 cases (targeting 15), deployed URLs, README, and demo video.
   - **Drop Order if behind schedule:** MCP server → Slack integration → Entity Graph view → Consolidation/digest (W4) → Time-travel slider → Reduce benchmark to 10 cases.

---

# 2. The Architecture Pattern: "Database Last"

All data access across the entire engine goes through a single, strictly typed **Repository interface**:
```typescript
interface Repository {
  saveMemory(memory: Memory): Promise<Memory>;
  findMemories(filter: MemoryFilter): Promise<Memory[]>;
  appendEvent(event: MemoryEvent): Promise<void>;
  searchVector(embedding: number[], topK: number, filter?: MemoryFilter): Promise<ScoredMemory[]>;
  searchKeyword(query: string, topK: number, filter?: MemoryFilter): Promise<ScoredMemory[]>;
  saveOutcome(outcome: Outcome): Promise<void>;
  saveEnvEvent(event: EnvEvent): Promise<void>;
  getEntityGraph(rootId: string): Promise<EntityGraph>;
  // Additional methods for quarantine, timetravel, and benchmark
}
```

### Why this guarantees success:
- **Phases 1 to 6: `InMemoryRepository`** implements this interface.
  - Vector search is computed using fast in-memory cosine similarity over stored embeddings.
  - Live updates are driven by a native Node `EventEmitter` feeding the Server-Sent Events (SSE) stream.
- **Phase 7: `MongoRepository`** implements the exact same interface.
  - Switching between backends requires changing just one environment variable: `STORE=memory` or `STORE=mongo`.
- **Result:** Nobody is blocked waiting for MongoDB provisioning, Atlas index builds, or network latency. Swapping storage does not touch the memory engine, the API routes, or the frontend UI.

---

# 3. Free Tool Stack (Replaces Paid Items in Blueprint)

| Need | Free Choice | Notes & Constraints |
|---|---|---|
| **Code & Repo** | GitHub, VS Code | 100% Free |
| **Backend** | Node 20 + Express + TypeScript, Zod, Pino | All open-source |
| **Frontend** | React 18 + Vite + TypeScript, Tailwind, shadcn/ui, Recharts, React Flow, TanStack Query | All open-source |
| **LLM (Extraction, Decisions, Agent)** | Google Gemini API free tier, Groq free tier, or OpenRouter free models | Keep strictly behind one unified `llm.ts` wrapper. Always ask for JSON output. Free tiers enforce rate limits: wrap calls in `p-limit` and cache every response by SHA-256 prompt hash. |
| **Embeddings** | Local model via Transformers.js (`all-MiniLM-L6-v2`, 384 dimensions) | No API key, zero cost, no rate limit, runs locally inside Node.js. Use **384 dimensions** (not 1536) in the vector index. (Alternative: Gemini embeddings free tier). |
| **Benchmark Judge** | Deterministic checks (string and field assertions) | Skip second-vendor LLM judge; deterministic checks are faster, reproducible, and cost nothing. |
| **Automation** | n8n Community Edition (self-hosted via Docker or `npx n8n`) | Completely free. Avoid n8n Cloud since it is a time-limited trial. |
| **Public URL for Webhooks** | `cloudflared tunnel` (free) or `ngrok` (free tier) | Exposes local backend port so n8n and Telegram webhooks reach the server. |
| **Human Approval** | Telegram Bot via `@BotFather` | Free, instant, mobile-friendly interactive buttons. |
| **Database (Last Phase)** | MongoDB Atlas M0 free cluster | Confirm in Atlas console that vector search, transactions, and change streams work on M0. Free tier permits two search indexes (1 vector + 1 text). Fallback if change streams are restricted: poll `memory_events` every 2 seconds. |
| **Frontend Hosting** | Vercel Hobby (free) | Instant continuous deployment from GitHub. |
| **Backend Hosting** | Render free web service (or run locally via tunnel during demo) | Free services sleep on idle; ping `/health` before demo presentation. |
| **Testing** | Vitest + Supertest | Fast, modern, zero-cost unit and integration tests. |

---

# 4. Roles & Ownership

| Member | Role | Owns |
|---|---|---|
| **Member A (Lead 1)** | Backend & Memory Engine Lead | Write path, trust & guard rules, retrieval & scoring, abstention, naive/none modes, lifecycle, time-travel, forget cascade, auth & isolation, `MongoRepository`. |
| **Member B (Lead 2)** | Frontend & Demo Lead | Dashboard (Chat, Inspector, Explorer, Quarantine Inbox, Timeline, Entity Graph, Benchmark charts, Simulate panel), UI polish, 3-minute demo video. |
| **Member C (Lead 3)** | Automation, Benchmark & Delivery Lead | n8n workflows (W1 to W5), Telegram bot, benchmark scenario fixtures (15 cases) and runner, tests, hosting/deploys, Atlas setup & indexes, README, pitch deck. |

> **Working Agreement:** Each member reviews at least one other member's pull requests so every team member understands the entire system.

---

# 5. Project Objective

Build an AI memory system that does more than store information and retrieve it through similarity search.

ANCHOR must be able to:

- Extract useful information from conversations and external events.
- Decide whether a new fact should be added, updated, superseded, quarantined or ignored.
- Store memories with source, trust, confidence and validity information.
- Retrieve relevant memories using vector and keyword search.
- Identify stale, contradictory or untrustworthy memories.
- Abstain when a memory should not be trusted.
- Show users why a memory was stored or retrieved.
- Demonstrate the difference between no memory, naive memory and governed memory.
- Measure the results through a 15-scenario benchmark.

---

# 6. Detailed Division of Work Among Three Members

## Member 1 (Member A) – Backend, Database and AI Memory Engine Lead

**Primary responsibility:** Build the complete backend architecture, repository layers, and the core memory intelligence.

This member owns the most important part of the system: the logic that decides what the AI should remember, whether it should trust that information, and how to verify, retrieve, or abstain.

### Module 1: Backend project setup, Repository abstraction & LLM wrapper

Create the backend application using Node.js 20, Express, and TypeScript.

Tasks:

1. Initialize the Node.js project with TypeScript and `tsx`.
2. Define the unified `Repository` interface and shared `types.ts` (`Memory`, `MemoryEvent`, `Outcome`, `EnvEvent`, `Entity`).
3. Implement `InMemoryRepository` for Phases 1 to 6 (pure in-memory storage with cosine similarity and Node `EventEmitter` for SSE).
4. Create the unified `llm.ts` wrapper supporting Google Gemini API free tier, Groq, or OpenRouter free models:
   - Enforce JSON-only output.
   - Implement exponential backoff, timeout, and retry logic.
   - Throttle concurrent calls with `p-limit`.
   - In-memory response cache keyed by SHA-256 prompt hash (enables fast, quota-safe, deterministic benchmark reruns).
5. Implement local embedding function using Transformers.js (`@xenova/transformers` with `all-MiniLM-L6-v2`, 384 dimensions) running locally inside Node.js (zero API key, zero cost, no rate limits).
6. Create the Express application with security middleware (`helmet`, `cors`), centralized error handling, and Zod request validation.
7. Add internal API key authentication middleware (`x-internal-key`) on n8n-facing routes.
8. Create a health-check endpoint `/api/health` reporting server status and active storage engine (`STORE=memory` or `STORE=mongo`).

Suggested dependencies:

- express
- @xenova/transformers
- zod
- jsonwebtoken
- bcryptjs
- helmet
- cors
- express-rate-limit
- pino
- p-limit
- dotenv
- mongodb (wired in Phase 7)

**Expected output:**

- Running backend server with `/api/health` responding.
- Working `InMemoryRepository`, `llm.ts`, and local 384-dimensional embedding pipeline.
- Backend deployment ready for Render (with keep-alive ping).

### Module 2: MongoDB database design (Phase 7 Drop-in Swap)

*Note: In Phases 1 to 6, `InMemoryRepository` handles all storage in code. MongoDB Atlas is wired up in Phase 7 via `MongoRepository` using the exact same interface.*

Create the 11 collections specified in the blueprint with JSON-schema validation:

| Collection | Purpose |
|---|---|
| users | User authentication |
| workspaces | Workspace isolation |
| memories | Current memory records |
| memory_events | Append-only memory history |
| outcomes | Approval and rejection feedback |
| observations | Incoming information before memory decisions |
| entities | People, services, libraries and project relationships |
| env_events | Deployment and environment changes |
| retrieval_logs | Retrieval results and score breakdown |
| benchmark_cases | Benchmark scenarios |
| benchmark_runs | Benchmark execution results |

The most important collection is `memories`.

Each memory should support these fields:

```json
{
  "owner": "user_id",
  "workspace": "workspace_id",
  "type": "semantic",
  "tier": "archive",
  "content": "Checkout DB timeouts are fixed by restarting the pool.",
  "embedding": [/* 384-dimensional vector from all-MiniLM-L6-v2 */],
  "entities": ["checkout-api", "pg-pool"],
  "attribute_key": "checkout-api.fix.db_timeout",
  "value": "restart pool",
  "depends_on": ["pg-pool"],
  "source": {
    "kind": "user_stated"
  },
  "trust": 0.8,
  "confidence": 0.9,
  "status": "active",
  "valid_from": "timestamp",
  "valid_to": null,
  "superseded_by": null,
  "env_fingerprint": {
    "service": "checkout-api",
    "version": "1.2"
  },
  "derived_from": [],
  "access_count": 0,
  "last_used_at": null,
  "expires_at": null
}
```

Create the following indexes on MongoDB Atlas M0:

- Compound index: `owner` + `workspace` + `status`.
- Key index: `attribute_key`.
- Expiry index: TTL index on `expires_at`.
- Events index: `memory_id` + `ts` on `memory_events`.
- Atlas Vector Search index named `memory_vector` (configured for **384 dimensions** with cosine similarity and filter fields).
- Atlas Text Search index named `memory_text` for keyword queries.
- *Fallback:* If MongoDB Change Streams are restricted on the free M0 tier, implement a 2-second polling loop on `memory_events` to feed SSE.

**Expected output:** MongoDB Atlas database configured with collections, schema validation, and indexes ready for the Phase 7 drop-in swap.

### Module 3: Authentication, user isolation and privacy

Implement:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/export`
- `DELETE /api/account`

Tasks:

1. Register users with bcryptjs password hashing.
2. Generate and verify JWT access tokens.
3. Wrap all repository calls to automatically inject `owner` and `workspace` filters.
4. Security test: Prove that User A cannot read User B's data by memory ID, keyword search, or vector retrieval.
5. PII Masking: Detect and mask sensitive patterns (emails, phone numbers, API keys) before generating embeddings or storing memories.

### Module 4: Governed memory write path – F1

This is the core feature.

Implement:

- `POST /api/ingest`
- `GET /api/memories`
- `GET /api/quarantine`
- `POST /api/quarantine/:id/release`
- `POST /api/quarantine/:id/reject`

Every incoming observation must pass through this pipeline:

```text
Incoming observation
        |
        v
Normalize input & PII masking
        |
        v
Safety screening (Injection patterns)
        |
        v
Extract candidate facts (type, entities, attribute_key, value, depends_on)
        |
        v
Find neighbours (cosine similarity + same attribute_key)
        |
        v
LLM proposes a decision
        |
        v
Deterministic guard rules (Code override)
        |
        v
Apply decision (InMemoryRepository or Mongo transaction)
        |
        v
Save memory event with explicit reason
        |
        v
Generate embedding asynchronously (all-MiniLM-L6-v2)
```

The five possible decisions are:

| Decision | Meaning |
|---|---|
| ADD | Create a new memory |
| UPDATE | Refine an existing memory |
| SUPERSEDE | Replace an old fact while retaining its history |
| QUARANTINE | Keep suspicious or conflicting information out of normal retrieval |
| IGNORE | Discard duplicate or irrelevant information |

Implement the Trust Ladder:

| Source | Trust Score |
|---|---:|
| `human_approved` | 1.00 |
| `system_event` | 0.85 |
| `user_stated` | 0.80 |
| `agent_inferred` | 0.50 |
| `unverified` | 0.20 |

**Deterministic Guard Rules (Code overrides LLM proposals):**
- **Injection Pattern forces QUARANTINE:** Any instruction injection attempt is immediately quarantined.
- **Trust Supremacy:** A lower-trust memory must **never** supersede a higher-trust memory (QUARANTINE instead).
- **Deduplication:** Near-duplicate facts with identical attribute key and value are marked **`IGNORE`**.
- **History Preservation:** Superseded memories retain their complete event history.
- **Auditable Reason:** Every decision must record an explicit reason in `memory_events`.
- **Unit Tests:** Member A must write unit tests for each individual guard rule.

**Expected output:** A working governed memory ingestion API with strict guard rules.

### Module 5: Hybrid retrieval and abstention – F4

Implement:

`POST /api/retrieve`

Retrieval pipeline:

```text
User query
    |
    v
Owner/workspace/status filtering
    |
    +----------------------+
    |                      |
    v                      v
Vector Search         Keyword Search
Top 20 results        Top 20 results
    |                      |
    +----------+-----------+
               |
               v
     Reciprocal Rank Fusion
               |
               v
        Final scoring
               |
               v
     Trust and environment checks
               |
               v
        Abstention decision
               |
               v
       Return usable memories
```

Use the blueprint's scoring formula:

```text
final_score =
similarity × trust × confidence × recency
```

Recency decay:

```text
recency = 0.5 ^ (age_days / half_life)
```

Half-life values:

- Episodic: 7 days.
- Semantic: 60 days.
- Procedural: 90 days.

Initial abstention rules:

- Minimum final score: 0.25.
- If two active memories have the same attribute key and their trust levels differ by less than 0.15, ask the user.
- Do not use stale or quarantined memories.
- Do not use memories that fail the environment checks.
- Inject retrieved memories as untrusted data, never as instructions.

**Expected output:** Retrieval API returning memories, score breakdowns and abstention flags.

### Module 6: Agent and three operating modes

Implement:

`POST /api/chat`

Support three modes:

1. `none` – answer without retrieving memory.
2. `naive` – use basic similarity-based memory retrieval.
3. `governed` – use ANCHOR's governed retrieval and safety rules.

The same question should be testable in all three modes.

The response should include:

- Generated answer.
- Mode.
- Retrieved memory IDs.
- Similarity score.
- Trust score.
- Confidence score.
- Recency score.
- Final score.
- Abstention flags.

### Module 7: Remaining backend APIs

Implement the APIs required by the frontend and automation workflows.

| Endpoint | Responsibility |
|---|---|
| `GET /api/memories` | List and filter memories |
| `GET /api/memories/:id` | Get one memory |
| `PATCH /api/memories/:id` | Edit memory |
| `DELETE /api/memories/:id` | Delete memory and derived memories |
| `GET /api/memories/:id/events` | Memory history |
| `POST /api/events/deploy` | Process deployment events |
| `POST /api/outcomes` | Process approval/rejection |
| `GET /api/quarantine` | List quarantined memories |
| `POST /api/quarantine/:id/release` | Release memory |
| `POST /api/quarantine/:id/reject` | Reject memory |
| `GET /api/timetravel` | Reconstruct memory state at a timestamp |
| `GET /api/stream` | SSE event stream |
| `POST /api/lifecycle/consolidate` | Memory consolidation |
| `POST /api/benchmark/run` | Start benchmark |
| `GET /api/benchmark/results` | Retrieve benchmark results |
| `GET /api/export` | Export user data |
| `DELETE /api/account` | Delete account |

### Member 1 deliverables

- [ ] Backend application.
- [ ] MongoDB collections and indexes.
- [ ] Authentication.
- [ ] Governed write path.
- [ ] Trust and conflict resolution.
- [ ] Hybrid retrieval.
- [ ] Abstention.
- [ ] None/naive/governed agent modes.
- [ ] Required REST APIs.
- [ ] Event history.
- [ ] Deployment event handling.
- [ ] SSE endpoint.
- [ ] Backend deployment and health URL.

---

## Member 2 (Member B) – Frontend and Demo Lead

**Primary responsibility:** Build the complete React dashboard, visualization screens, interactive panels, and deliver the final 3-minute demo video.

The dashboard is extremely important because the blueprint expects judges to see the memory decisions, retrieval scores, quarantine decisions and benchmark results.

### Module 1: Frontend project setup

Create a React application using Vite and TypeScript.

Tasks:

1. Initialize the React project.
2. Configure TypeScript.
3. Install Tailwind CSS.
4. Configure shadcn/ui.
5. Install React Router.
6. Install TanStack Query.
7. Install Recharts.
8. Install React Flow.
9. Install lucide-react.
10. Install date-fns.
11. Configure the backend API base URL.

Create a reusable API service that handles:

- API requests with TanStack Query.
- JWT authentication headers.
- Error responses.
- Loading and empty states.
- API response types.
- **Contract Mock API (Phase 0):** Build a mock API (static JSON or a lightweight mock server) derived directly from the API contract so the frontend can be built and styled independently without waiting for the backend.

### Module 2: Authentication screens

Create:

- Login page.
- Registration page.
- Protected dashboard routes.
- Logout functionality.

Connect the screens to:

- `POST /api/auth/register`
- `POST /api/auth/login`

Store and send the authentication token using a suitable secure approach.

### Module 3: Main dashboard layout

Create a dashboard with navigation for:

1. Chat.
2. Memory Explorer.
3. Retrieval Inspector.
4. Quarantine Inbox.
5. Timeline.
6. Entity Graph.
7. Benchmark.
8. Settings and Privacy.

Create reusable components:

- Sidebar.
- Header.
- Navigation.
- Loading indicator.
- Error message.
- Modal.
- Confirmation dialog.
- Data table.
- Status indicator.
- Empty state.

### Module 4: Chat interface

Create the main interaction screen.

Required features:

- Chat input.
- Message history.
- AI response display.
- Mode selection: none / naive / governed.
- Memory references inside responses.
- Abstention warning banner with explicit explanation.
- **Compare Mode:** Send one question simultaneously to all three arms (`none`, `naive`, `governed`) and render the answers side by side with citations and scores.

Example:

User asks:

"Which database are we currently using?"

The dashboard sends the prompt to `none` (hallucinates/generic), `naive` (retrieves obsolete/stale doc), and `governed` (abstains or provides verified active fact), displaying answers side by side.

Connect to:

`POST /api/chat`

**Expected output:** A working AI chat interface.

### Module 5: Retrieval Inspector

This is one of the most important dashboard features.

After each chat request, display:

| Field | Description |
|---|---|
| Memory ID | Retrieved memory identifier |
| Similarity | Semantic similarity |
| Trust | Source reliability |
| Confidence | Confidence value |
| Recency | Time-based score |
| Final score | Combined retrieval score |
| Status | Active, stale, etc. |

Also display memories that were excluded and the reason:

- Stale.
- Quarantined.
- Expired.
- Low score.
- Environment mismatch.
- Conflicting information.

Connect to:

`POST /api/retrieve`

The inspector should make it clear why ANCHOR used or rejected a memory.

### Module 6: Memory Explorer

Create a page showing stored memories.

Provide filters for:

- Memory type.
- Tier.
- Status.
- Entity.
- Source.

Display memory details:

- Content.
- Trust.
- Confidence.
- Source.
- Created date.
- Validity.
- Dependencies.
- Current status.

Add actions:

- View details.
- Edit.
- Promote to core.
- Mark human-approved.
- Delete.

Connect to:

- `GET /api/memories`
- `GET /api/memories/:id`
- `PATCH /api/memories/:id`
- `DELETE /api/memories/:id`

### Module 7: Quarantine Inbox

Create a separate page for suspicious or conflicting memories.

Display:

- Memory content.
- Source.
- Trust level.
- Quarantine reason.
- Related conflicting memory.

Provide:

- Release button.
- Reject button.

Connect to:

- `GET /api/quarantine`
- `POST /api/quarantine/:id/release`
- `POST /api/quarantine/:id/reject`

### Module 8: Timeline and Time Travel

Create a timeline displaying memory events.

Display:

- Memory created.
- Memory updated.
- Memory superseded.
- Memory quarantined.
- Memory released.
- Memory marked stale.
- Memory deleted.

Add a time slider.

When the user selects a previous date or time, display the memory state at that point.

Connect to:

- `GET /api/memories/:id/events`
- `GET /api/timetravel`
- `GET /api/stream`

Use SSE to display live event updates.

### Module 9: Entity Graph

Use React Flow to visualize relationships.

Example:

```text
checkout-api
     |
     v
pg-pool
     |
     v
database-timeout-fix
     |
     v
related-memory
```

Show dependencies and highlight memories affected by a deployment.

### Module 10: Benchmark dashboard

Create a benchmark page showing:

- Run Benchmark button.
- Three comparison modes.
- Total test cases.
- Correct-action rate.
- Harmful-action rate.
- Stale-reuse rate.
- Poison-acceptance rate.
- Abstention precision.
- Average latency.
- Token usage.

Create 3 interactive charts using Recharts:

1. **Chart 1 (Grouped Bars by Category):** Performance across scenario categories (Stale, Poison, Contradiction, Control) comparing the three arms (`none`, `naive`, `governed`).
2. **Chart 2 (Harmful-Action Rate):** Direct comparison of harmful/unsafe actions per arm, demonstrating ANCHOR's zero-tolerance safety.
3. **Chart 3 (Confidence Trajectory):** Dynamic confidence decay curve of a single memory under repeated human rejections/negative outcomes.

Connect to:

- `POST /api/benchmark/run`
- `GET /api/benchmark/results`

### Module 11: Settings and Privacy

Create a settings page containing:

- TTL defaults.
- Data export.
- Account deletion.
- Privacy information.

Connect to:

- `GET /api/export`
- `DELETE /api/account`

### Module 12: Simulate panel

Add two buttons:

- Simulate Alert.
- Simulate Deploy.

These buttons should call the n8n webhooks so judges can demonstrate the full event-driven workflow without relying on real monitoring systems or deployment events.

### Member 2 deliverables

- [ ] React project.
- [ ] Login and registration.
- [ ] Dashboard layout.
- [ ] Chat interface.
- [ ] Three-mode comparison.
- [ ] Retrieval Inspector.
- [ ] Memory Explorer.
- [ ] Quarantine Inbox.
- [ ] Timeline and time-travel slider.
- [ ] Entity Graph.
- [ ] Benchmark dashboard.
- [ ] Settings and Privacy.
- [ ] Simulate Alert and Deploy panel.
- [ ] Frontend deployment on Vercel.

---

## Member 3 (Member C) – Automation, Benchmark and Delivery Lead

**Primary responsibility:** Build external automation workflows (n8n W1 to W5), Telegram approval bot, benchmark fixtures (15 scenarios) and runner, MongoDB Atlas setup, and final project delivery (README, deck, demo video rehearsal).

This member should not independently write memories directly into MongoDB. All memory-changing operations must strictly go through Member 1's governed backend API.

### Module 1: n8n Community Edition & Cloudflared Setup

Set up n8n using:

- **n8n Community Edition** self-hosted on a laptop via Docker or `npx n8n` (completely free; avoid n8n Cloud trial due to time limits).
- Expose the local backend and webhooks via **`cloudflared tunnel`** (free) or **ngrok free**, allowing n8n and Telegram to reach backend endpoints.
- Configure Telegram Bot via `@BotFather` and capture Bot Token and Chat ID.
- Store the shared free LLM key (Google Gemini or Groq) in n8n and backend environment variables (never committed to GitHub).

Configure:

- n8n instance.
- Webhook access.
- Telegram Bot.
- Backend API credentials.
- Internal API secret.

Create a reusable HTTP Request credential containing the internal API key.

### Module 2: W1 – Alert ingestion workflow

**Goal:** When an alert arrives, send it through ANCHOR's memory engine and notify a human.

Workflow:

```text
Alert Webhook
      |
      v
Normalize alert
      |
      v
POST /api/ingest
      |
      v
POST /api/agent/triage
      |
      v
Generate proposed fix
      |
      v
Send Telegram message
      |
      v
Approve / Reject
```

Implementation tasks:

1. Create a webhook trigger.
2. Receive an alert JSON.
3. Normalize the alert fields.
4. Send the alert to `/api/ingest`.
5. Send the incident to the agent for triage.
6. Receive the proposed fix.
7. Send the result to Telegram.
8. Include inline Approve and Reject buttons.
9. Save workflow exports as JSON in `docs/n8n/`.
10. **Fallback Script:** Maintain a `curl`-based fallback shell script for all webhook triggers in case n8n or tunnels encounter local connectivity issues during the live demo.

**Expected output:** An incoming alert becomes a governed memory and triggers an agent response.

### Module 3: W2 – Deployment event workflow

**Goal:** Prevent ANCHOR from blindly reusing fixes that have become outdated.

Workflow:

```text
GitHub Deploy Webhook
          |
          v
Extract service/version
          |
          v
Extract changed components
          |
          v
POST /api/events/deploy
          |
          v
Backend identifies affected memories
          |
          v
Mark affected memories stale
          |
          v
Send Telegram summary
```

Tasks:

1. Create a webhook trigger.
2. Receive deployment information.
3. Extract old and new versions.
4. Extract changed components.
5. Call `/api/events/deploy`.
6. Receive the number of affected memories.
7. Send a Telegram summary.

**Expected output:** Only memories that depend on changed components are marked stale.

### Module 4: W3 – Human approval workflow

**Goal:** Use human feedback to improve memory confidence and manage quarantined items.

Workflow:

```text
Telegram Approval/Reject
          |
          v
Parse callback
          |
          v
POST /api/outcomes
          |
          v
Update confidence/trust
          |
          v
Release or reject quarantine item
          |
          v
Send result to Telegram
```

Tasks:

1. Create a Telegram Trigger.
2. Capture the approval or rejection callback.
3. Identify the memory.
4. Send the outcome to `/api/outcomes`.
5. Update confidence through the backend.
6. If the item is quarantined, call the appropriate release or reject API.
7. Update the Telegram message.

**Expected output:** Human approval and rejection influence future memory decisions.

### Module 5: W4 – Nightly consolidation and digest

**Goal:** Keep the memory system organized.

Workflow:

```text
Schedule Trigger
       |
       v
POST /api/lifecycle/consolidate
       |
       v
Read-only MongoDB aggregation
       |
       v
Collect memory statistics
       |
       v
Send Telegram/Slack digest
```

Tasks:

- Configure a scheduled trigger.
- Call the consolidation endpoint.
- Read memory statistics using the MongoDB node.
- Prepare a digest.
- Send the digest to Telegram or Slack.

The MongoDB node should be read-only for this workflow. The backend owns governed memory writes.

### Module 6: W5 – Benchmark workflow

**Goal:** Allow the benchmark to be executed through n8n.

Workflow:

```text
Manual/Webhook Trigger
        |
        v
POST /api/benchmark/run
        |
        v
Poll benchmark status
        |
        v
Fetch results
        |
        v
Notify completion
```

### Module 7: Benchmark scenario preparation

Prepare the 15 scenarios from the blueprint.

| Scenario | Category | Expected governed behavior |
|---|---|---|
| S1 | Stale after deploy | Flag stale and abstain |
| S2 | Stale after deploy | Do not reuse old configuration flag |
| S3 | Stale after deploy | Use new URL or ask |
| S4 | Stale after deploy | Warn about deprecated command |
| S5 | Control | Reuse valid fix after unrelated deploy |
| P1 | Poisoning | Quarantine malicious instruction |
| P2 | Poisoning | Protect human-approved memory |
| P3 | Poisoning | Resist repeated low-trust claims |
| P4 | Poisoning | Quarantine data-exfiltration instruction |
| C1 | Contradiction | Supersede old preference |
| C2 | Contradiction | Show both and ask |
| C3 | Time travel | Return correct historical state |
| C4 | Contradiction | Avoid previously rejected fix |
| K1 | Control | Correctly recall stable preference |
| K2 | Control | Avoid irrelevant memory injection |

For each scenario, prepare:

- Scenario ID.
- Initial observations.
- Required memory setup.
- Events to simulate.
- Test query.
- Expected behavior.
- Ground-truth assertions.

Run every scenario in:

1. No memory mode (`none`).
2. Naive memory mode (`naive`).
3. Governed memory mode (`governed`).

Benchmark Runner Execution Rules:
- For each case, reset to seed data, replay setup observations, ask query in each arm, and execute deterministic assertions.
- Deterministic checks: Did the answer contain the stale command? Did poisoned text reach the context?
- Run each case **3 times and average** the metrics (correct-action rate, harmful-action rate, stale-reuse rate, poison-acceptance rate, abstention precision, latency, tokens).
- Cache LLM responses by SHA-256 prompt hash so reruns are instantaneous and repeatable.
- Report honest benchmark results including control scenarios (`S5`, `K1`, `K2`). If governed memory over-triggers abstention on controls, tune thresholds with Member A.

### Module 8: Testing

Test the complete system.

**Backend tests**

- Authentication.
- Memory insertion.
- Memory update.
- Memory superseding.
- Quarantine.
- Duplicate detection.
- Trust rules.
- Retrieval.
- Abstention.
- Stale memory detection.

**Integration tests**

- Chat to backend.
- Backend to MongoDB.
- Frontend to backend.
- n8n to backend.
- Telegram approval to backend.
- Deploy webhook to stale-memory detection.

**Security tests**

- User A cannot access User B's memory.
- Invalid JWT is rejected.
- Invalid request data is rejected.
- Webhooks require secret authentication.
- API secrets are not exposed in the frontend.
- Retrieved memories are never treated as system instructions.

### Module 9: Deployment and submission

Tasks:

1. Check backend deployment.
2. Check frontend deployment.
3. Check n8n workflows.
4. Test Telegram integration.
5. Test the system using deployed URLs.
6. Export n8n workflows as JSON.
7. Prepare benchmark results.
8. Prepare README.
9. Prepare demo account and seed script.
10. Prepare demo video.
11. Prepare pitch deck.

### Member 3 deliverables

- [ ] n8n configured.
- [ ] W1 Alert ingestion.
- [ ] W2 Deployment-to-stale workflow.
- [ ] W3 Human approval.
- [ ] W4 Consolidation and digest.
- [ ] W5 Benchmark workflow.
- [ ] Telegram integration.
- [ ] 15 benchmark scenarios.
- [ ] Three-mode benchmark execution.
- [ ] Integration and security tests.
- [ ] n8n JSON exports.
- [ ] README and demo preparation.
- [ ] Final deployment verification.

---

# 7. Phase-wise Implementation Plan (Phases 0 to 8)

The team executes in 9 distinct phases. Until Phase 7, the system runs 100% on `InMemoryRepository` with zero database dependencies.

## 7.1 Phase Overview

| Phase | Goal | Done When |
|---|---|---|
| **0** | Setup and shared contracts | Repo runs on all laptops; API shapes agreed |
| **1** | Governed write path | Poisoned text is quarantined; supersede works |
| **2** | Retrieval, scoring, abstention | Inspector data is correct; abstention triggers |
| **3** | Three modes (none / naive / governed) | Same question gives three different behaviours |
| **4** | Event paths (deploy staleness, n8n W1 to W3) | Alert, then memory, then Telegram buttons, then outcome works end to end |
| **5** | Benchmark | 15 cases run; three-arm charts shown |
| **6** | Time travel, lifecycle, forget, auth, graph | Slider and forget demo work |
| **7** | MongoDB Atlas (last phase) | Whole app runs with `STORE=mongo` and passes the same tests |
| **8** | Deploy, polish, submit | Public URLs work; README, deck and video done |

---

## 7.2 Detailed Task List by Phase and Member

### Phase 0: Setup and Shared Contracts (All members, ~1 hour)
- **Member A (Backend):**
  - Create the GitHub repository with folders `backend/`, `frontend/`, `n8n/`, `docs/`, `benchmark/`.
  - Scaffold Express + TypeScript backend with `/api/health` route.
  - Define the unified `Repository` interface and shared `types.ts` (`Memory`, `MemoryEvent`, `Outcome`, `EnvEvent`, `Entity`).
  - Write the API contract: request and response JSON for every route in the blueprint.
- **Member B (Frontend):**
  - Scaffold React + Vite + Tailwind + shadcn/ui and React Router with empty placeholder pages for each screen.
  - Build a mock API (static JSON or a small mock server) directly from the contract so the UI can be built and styled without waiting for the backend.
- **Member C (Automation & Delivery):**
  - Start n8n locally via Docker or `npx n8n` and open a `cloudflared tunnel` or `ngrok` tunnel.
  - Create Telegram Bot via `@BotFather`, note bot token and chat ID.
  - Acquire free LLM API key (Google Gemini or Groq) and distribute privately (never in git).
  - Create `.env.example` listing every environment variable without secrets.

### Phase 1: Governed Write Path (~3 to 4 hours)
- **Member A (Backend):**
  - Implement unified `llm.ts` wrapper with JSON output, timeout, retry, and prompt hash cache.
  - Implement local embedding function (Transformers.js `all-MiniLM-L6-v2`, 384 dimensions) and `InMemoryRepository`.
  - Ingestion pipeline: normalize, safety screen (injection patterns), extract candidate facts, find neighbours (cosine similarity + attribute key), LLM proposes decision, deterministic guard rules override, apply and write immutable event with reason.
  - Trust ladder: `human_approved` 1.0, `system_event` 0.85, `user_stated` 0.8, `agent_inferred` 0.5, `unverified` 0.2.
  - Guard rules: injection pattern forces `QUARANTINE`; lower trust cannot supersede higher trust (`QUARANTINE` instead); near-duplicate is `IGNORE`.
  - Routes: `POST /api/ingest`, `GET /api/memories`, `GET /api/quarantine`, `POST /api/quarantine/:id/release|reject`.
  - Unit tests for each guard rule.
- **Member B (Frontend):**
  - App layout, navigation, and API client with TanStack Query.
  - Memory Explorer page (list, filters by type, status, source; memory card displaying trust, confidence, status, validity window).
  - Quarantine inbox page (reason, source, Release and Reject buttons). Test with mock data first, then connect to real backend API.
- **Member C (Automation & Delivery):**
  - Write the 15 benchmark scenarios as JSON fixtures (setup observations, deploy events, test query, ground-truth expectation) using blueprint Section 14.
  - Write the seed script that loads a demo account and starter memories.
  - Draft poisoned-note attack examples for the demo (P1 prompt injection and P4 data exfiltration).

### Phase 2: Retrieval, Scoring and Abstention (~3 hours)
- **Member A (Backend):**
  - Pre-filter: `owner`, `workspace`, status `active`, valid time window.
  - Hybrid search: In-memory vector cosine similarity + keyword search; merge results using Reciprocal Rank Fusion (RRF).
  - Score formula: `similarity × trust × confidence × recency` (half-lives: episodic 7d, semantic 60d, procedural 90d; core tier skips recency decay).
  - Deterministic abstention rules:
    1. Score below **0.25**.
    2. Environment fingerprint mismatch with dependency overlap from recent deployments.
    3. Two top memories disagree on the same attribute key with a trust gap under **0.15**.
  - Wrap retrieved memories in a strictly delimited block labeled `untrusted data`.
  - Routes: `POST /api/retrieve`, `POST /api/chat` (governed mode first). Save every retrieval to `retrieval_logs`.
- **Member B (Frontend):**
  - Chat page with message list, citations to memory IDs, and dynamic abstention warning banner.
  - Retrieval Inspector panel: for each retrieved memory show similarity, trust, confidence, recency, final score; list filtered-out memories with the explicit reason.
- **Member C (Automation & Delivery):**
  - Unit tests for scoring and abstention using fixture memories.
  - Prepare the 3 system prompts (extraction, decision, agent reply) in collaboration with Member A and store in `backend/prompts/`.

### Phase 3: Three Modes (~2 hours)
- **Member A (Backend):**
  - Add mode toggle to `POST /api/chat`:
    - `none` (no memory retrieved).
    - `naive` (plain top-k vector similarity, no trust filtering, no lifecycle, no staleness check; kept truly naive as the industry baseline).
    - `governed` (full ANCHOR guardrails and abstention).
- **Member B (Frontend):**
  - Mode toggle on the Chat page.
  - Compare mode: one question submitted to all three arms simultaneously, displaying answers side by side.
- **Member C (Automation & Delivery):**
  - Verify that the scripted test question gives three visibly different behaviors across the three modes; report any unexpected divergence.

### Phase 4: Event Paths: Deploy Staleness and n8n W1 to W3 (~4 hours)
- **Member A (Backend):**
  - `POST /api/events/deploy`: Mark a memory `stale` **only if its `depends_on` overlaps changed components** (code decides, never the LLM).
  - `POST /api/outcomes`: Update confidence via Bayesian formula: `confidence = (prior × 4 + successes) / (4 + successes + 2 × failures)`.
  - `POST /api/agent/triage`: Given an alert payload, retrieve past operational fixes and propose a remediation action.
  - Internal API key check (`x-internal-key`) on n8n-facing webhook routes.
  - Entity relationship edges (`depends_on`, `owned_by`) with recursive traversal to identify all affected downstream memories.
- **Member B (Frontend):**
  - Simulate panel: Add "Send Fake Alert" and "Send Fake Deploy" buttons calling n8n webhooks.
  - Memory cards show prominent `stale` badge; confidence bar updates dynamically after feedback.
  - Live event feed using Server-Sent Events (SSE) backed by Node `EventEmitter`.
- **Member C (Automation & Delivery):**
  - **W1 Alert Ingestion:** Webhook trigger → `/api/ingest` → `/api/agent/triage` → Telegram message with interactive Approve and Reject buttons.
  - **W2 Deploy to Stale:** Webhook trigger → `/api/events/deploy` → Telegram summary of affected components.
  - **W3 Human Approval:** Telegram callback query → `/api/outcomes` (and quarantine release/reject) → edit Telegram message in place.
  - Error workflow routing execution failures to Telegram.
  - Export every workflow as JSON into `docs/n8n/`; keep a `curl`-based fallback shell script for demo safety.

### Phase 5: Benchmark (~3 hours)
- **Member A (Backend):**
  - `POST /api/benchmark/run` and `GET /api/benchmark/results`.
  - Benchmark Runner: for each case, reset to seed data, replay setup, ask query in each of the three arms, run deterministic assertions (e.g., Did the answer contain the stale command? Did poisoned text reach the LLM context?).
  - Metrics: correct-action rate, harmful-action rate, stale-reuse rate, poison-acceptance rate, abstention precision, latency, token count. Run each case 3 times and average. Cache LLM responses by prompt hash so reruns are instantaneous and quota-safe.
- **Member B (Frontend):**
  - Benchmark page: "Run Benchmark" button, results summary cards, per-case drill-down table with full transcript.
  - 3 Recharts visual charts:
    - Chart 1: Grouped bars by category (Stale, Poison, Contradiction, Control) across three arms.
    - Chart 2: Harmful-action rate per arm.
    - Chart 3: Confidence trajectory of one memory under repeated rejections.
- **Member C (Automation & Delivery):**
  - Own scenario fixtures and ground truth; fix any ambiguous assertions.
  - **W5 Benchmark Runner Workflow** (trigger, poll status, send Telegram notification on completion).
  - Report honest results including control scenarios (`S5`, `K1`, `K2`); tune abstention thresholds with Member A if governed mode over-triggers.

### Phase 6: Time Travel, Lifecycle, Forget, Auth, Graph (~4 hours)
- **Member A (Backend):**
  - Time travel: `GET /api/timetravel?at=ISO` replays events up to timestamp and returns reconstructed memory state.
  - Lifecycle: TTL expiry per memory type, nightly consolidation of episodic memories into semantic summaries with `derived_from` links, promotion of heavily used high-confidence items to `core` tier.
  - Forget Cascade: `DELETE /api/memories/:id` removes memory and everything derived from it, writing an immutable tombstone event with no sensitive content.
  - Auth and isolation: JWT login, bcrypt password hashing, repository wrapper injecting `owner` and `workspace`, and security tests verifying User A cannot read User B's data by ID, search, or retrieval.
  - PII masking (emails, phone numbers, API keys) before embedding; `GET /api/export` and `DELETE /api/account`.
- **Member B (Frontend):**
  - Timeline page with live event feed and time-travel slider (shows memory set and agent response at that exact historical moment).
  - Entity Graph page with React Flow; highlight stale memories after a deploy.
  - Settings page (data export, account deletion) and Login/Register pages.
- **Member C (Automation & Delivery):**
  - **W4 Nightly Consolidation & Digest Workflow.**
  - Tests: cross-user data leak test, forget cascade test, TTL expiry test, time travel test.
  - Rehearse the 3-minute demo script end to end on the local build.

### Phase 7: MongoDB Atlas (Last Phase) (~3 hours)
- **Member C (Lead for Setup):**
  - Create free MongoDB Atlas M0 cluster, configure database user and network access (`0.0.0.0/0`). Confirm vector search, transactions, and change streams.
  - Create the 11 collections with JSON-schema validation (`users`, `workspaces`, `memories`, `memory_events`, `outcomes`, `observations`, `entities`, `env_events`, `retrieval_logs`, `benchmark_cases`, `benchmark_runs`).
  - Create Atlas indexes: compound `owner` + `workspace` + `status`; `attribute_key`; TTL on `expires_at`; `memory_id` + `ts` on events; Atlas Vector Search index (384 dimensions) and Atlas Text Search index.
  - Write migration script copying seed data into MongoDB.
- **Member A (Lead for Code):**
  - Implement `MongoRepository` against the exact same `Repository` interface.
  - Replace in-code cosine search with Atlas vector search stage (`$vectorSearch`), retaining in-code cosine as a robust fallback.
  - Wrap memory + event writes in MongoDB transactions.
  - Replace Node `EventEmitter` with MongoDB Change Streams feeding SSE (or 2-second polling fallback if M0 restricts change streams).
  - Implement `$graphLookup` for recursive entity traversal and aggregation pipelines for time travel and benchmark charts.
- **Member B (Frontend):**
  - Re-test every screen with `STORE=mongo`; verify identical response shapes; add loading indicators and empty states.
- **Done When:** The complete test suite and benchmark give identical results with `STORE=memory` and `STORE=mongo`.

### Phase 8: Deploy, Polish and Submit (~3 hours)
- **Member A (Backend):**
  - Deploy backend to Render (free tier), configure environment variables in dashboard, verify `/api/health`.
  - Feature freeze: fix critical bugs only.
- **Member B (Frontend):**
  - Deploy frontend to Vercel (free tier), set `VITE_API_BASE_URL` environment variable.
  - Visual polish, typography, and record the 2-3 minute demo video following the blueprint script.
- **Member C (Automation & Delivery):**
  - Final n8n workflow exports; configure keep-alive ping so the free backend does not sleep during judging.
  - Finalize `README.md`: problem statement, architecture diagram, local & cloud setup instructions, environment variable list, n8n JSON exports, and benchmark reproduction commands.
  - Create pitch deck (~8 slides) and provision judge demo credentials.
  - Test deployed URLs on mobile device and in incognito window.

---

## 7.3 Suggested Schedule & Time Allocation

| Day & Time | Phases Covered | Milestone / Deliverable |
|---|---|---|
| **30 Oct, Full Day** | Phase 0 to Phase 4 | Full alert-to-Telegram loop working locally with `InMemoryRepository` |
| **31 Oct, Morning** | Phase 5, Phase 6 | 15-case benchmark complete, time-travel slider and forget cascade working |
| **31 Oct, Afternoon** | Phase 7 (MongoDB Atlas) | Drop-in swap to `STORE=mongo`, feature freeze by ~5:00 PM |
| **31 Oct, Evening** | Phase 8 (Deploy & Polish) | Submit by ~8:00 PM, leaving a 2-hour buffer before the 10:00 PM deadline |

---

## 7.4 Cut-Line Strategy & Drop Order

If the team falls behind schedule, drop non-essential stretch features strictly in this order:
1. **MCP Server** (Drop first)
2. **Slack Integration** (Rely solely on Telegram)
3. **Entity Graph View** (Keep table/list representation)
4. **W4 Consolidation Workflow** (Keep manual trigger)
5. **Time-Travel Interactive Slider** (Keep API-only time travel)
6. **Reduce Benchmark Scenarios** (Drop from 15 cases to 10 core cases)

**Never Cut (Core Blueprint Deliverables):**
- Governed write path with trust hierarchy.
- Hybrid retrieval with deterministic abstention.
- None / Naive / Governed operating mode toggle.
- n8n W1 to W3 workflows with Telegram interactive approval.
- Retrieval Inspector showing exact score breakdowns.
- Benchmark with at least 10 scenarios and comparison charts.
- Public deployed URLs (Render + Vercel), comprehensive README, and recorded demo video.

---

## 7.5 Team Working Agreements

1. **Branches:** One branch per phase per member, merged via pull request into `main`. `main` must build and run at all times.
2. **Daily Sync:** Short 10-minute check-in at the start of each phase to unblock dependencies.
3. **Contracts First:** Nobody changes an API request or response shape without notifying the team, because the frontend and n8n workflows depend strictly on these contracts.
4. **Free-Tier Safety:** Cache all LLM and embedding responses by SHA-256 hash, use `p-limit` to prevent 429 rate limit errors, and keep a pre-recorded backup demo video in case of upstream provider outages.
5. **Honest Benchmark Reporting:** Always report true results on control scenarios (`S5`, `K1`, `K2`), demonstrating that ANCHOR knows when to retrieve as well as when to abstain.
6. **Code Reviews:** Each member reviews at least one pull request from another member per phase to maintain complete team awareness across backend, frontend, and automation.

---

## 7.6 Open Items to Confirm

- **Problem Statement 1 Alignment:** Final review against the official competition rubric to confirm every required deliverable is represented.
- **Member Roles Assignment:** Confirm final role ownership across Members A, B, and C.
- **Time Audit:** If available development hours are reduced, immediately apply the cut-line order in Section 7.4.
- **LLM Provider Choice:** Confirm primary free LLM API key (Google Gemini API vs Groq vs OpenRouter) and configure its rate limits in `p-limit`.

---

# 8. Shared API contract

All members must agree on the API contracts before developing their respective modules.

## Example: Ingest memory

`POST /api/ingest`

Request:

```json
{
  "text": "We have moved our database from Postgres to MongoDB.",
  "source": {
    "kind": "user_stated"
  },
  "workspace": "workspace_123"
}
```

Expected response:

```json
{
  "success": true,
  "decisions": [
    {
      "action": "SUPERSEDE",
      "reason": "The new database choice replaces the previous decision.",
      "memory_id": "memory_123"
    }
  ]
}
```

## Example: Chat

`POST /api/chat`

Request:

```json
{
  "message": "Which database are we using?",
  "mode": "governed"
}
```

Expected response:

```json
{
  "answer": "The current database is MongoDB.",
  "mode": "governed",
  "memories": [
    {
      "memory_id": "memory_123",
      "similarity": 0.92,
      "trust": 0.8,
      "confidence": 0.95,
      "recency": 1.0,
      "final_score": 0.70
    }
  ],
  "abstention": false
}
```

## Example: Deploy Event (Staleness Marking)

`POST /api/events/deploy`

Request:

```json
{
  "service": "checkout-api",
  "version": "1.3.0",
  "changed_components": ["pg-pool", "db-config"],
  "environment": "production"
}
```

Expected response:

```json
{
  "success": true,
  "affected_memories_count": 2,
  "stale_memory_ids": ["memory_123", "memory_456"],
  "reason": "Component 'pg-pool' changed in deploy v1.3.0"
}
```

## Example: Outcome Feedback (Bayesian Confidence Update)

`POST /api/outcomes`

Request:

```json
{
  "memory_id": "memory_123",
  "action": "APPROVED",
  "feedback_source": "telegram_human_approval",
  "user_id": "user_admin"
}
```

Expected response:

```json
{
  "success": true,
  "memory_id": "memory_123",
  "previous_confidence": 0.80,
  "new_confidence": 0.86,
  "formula_applied": "(prior * 4 + successes) / (4 + successes + 2 * failures)"
}
```

## Example: Agent Triage Proposal

`POST /api/agent/triage`

Request:

```json
{
  "alert_id": "alert_991",
  "service": "checkout-api",
  "error_message": "DB connection timeout on pool acquisition"
}
```

Expected response:

```json
{
  "alert_id": "alert_991",
  "proposed_action": "Restart checkout-api db pool",
  "confidence": 0.86,
  "memory_id": "memory_123",
  "status": "AWAITING_HUMAN_APPROVAL"
}
```

## Example: Time Travel State Reconstruction

`GET /api/timetravel?at=2026-10-30T14:00:00Z`

Expected response:

```json
{
  "reconstructed_at": "2026-10-30T14:00:00Z",
  "active_memories": [
    {
      "id": "memory_120",
      "content": "Database is Postgres v14",
      "status": "active"
    }
  ],
  "events_replayed_count": 14
}
```

These are illustrative contract examples. Member 1 should define the final validated schemas and share them with Members 2 and 3 before integration.

---

# 9. Recommended GitHub folder structure

Use one repository with separate frontend, backend, automation and documentation folders.

```text
ANCHOR/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   ├── Chat/
│   │   │   ├── Inspector/
│   │   │   ├── MemoryExplorer/
│   │   │   ├── Quarantine/
│   │   │   ├── Timeline/
│   │   │   ├── EntityGraph/
│   │   │   ├── Benchmark/
│   │   │   └── Settings/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── memory/
│   │   │   ├── retrieval/
│   │   │   ├── agent/
│   │   │   ├── embedding/
│   │   │   └── benchmark/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── server.ts
│   ├── tests/
│   └── package.json
│
├── n8n/
│   ├── W1-alert-ingestion.json
│   ├── W2-deploy-stale.json
│   ├── W3-human-approval.json
│   ├── W4-consolidation.json
│   ├── W5-benchmark.json
│   └── error-workflow.json
│
├── benchmark/
│   ├── scenarios/
│   │   ├── S1.json
│   │   ├── S2.json
│   │   ├── ...
│   │   └── K2.json
│   └── results/
│
├── docs/
│   ├── architecture.md
│   ├── api-documentation.md
│   ├── database-schema.md
│   └── setup-guide.md
│
├── .gitignore
├── .env.example
└── README.md
```

---

# 10. Team collaboration rules

To avoid integration problems, follow these rules.

### Rule 1: Member 1 owns memory logic

Members 2 and 3 must not independently implement memory decisions or directly modify MongoDB memory records.

All memory changes must go through the governed API.

### Rule 2: Member 2 works against agreed API contracts

Member 2 should not wait for every backend feature to be finished.

Use mock JSON responses initially, then replace them with actual API calls.

### Rule 3: Member 3 works through backend endpoints

n8n must call the backend API. It must not directly insert, update or delete memory documents.

### Rule 4: Commit frequently

Use branches:

```text
main
backend
frontend
automation
```

Each member commits their work to their respective branch. Merge working features into `main` regularly.

### Rule 5: Integrate early

Do not wait until the end to connect everything.

The first end-to-end integration should happen as soon as:

- Backend health check works.
- Frontend can call the backend.
- n8n can call the ingestion endpoint.

### Rule 6: Keep API documentation updated

Whenever Member 1 changes a request or response structure, update the API documentation and inform the other members.

---

# 11. Final priority list

The blueprint labels F1–F9 as MUST, F10 as STRETCH, but its later cut-line also moves some advanced lifecycle and time-travel details into SHOULD. To avoid confusion, use this practical implementation order:

## Must complete first

- [ ] Governed write path.
- [ ] Trust levels and conflict handling.
- [ ] Hybrid retrieval.
- [ ] Abstention.
- [ ] None/naive/governed modes.
- [ ] W1 alert ingestion.
- [ ] W2 deployment event.
- [ ] W3 human approval.
- [ ] Chat interface.
- [ ] Retrieval Inspector.
- [ ] Memory Explorer.
- [ ] Quarantine Inbox.
- [ ] Benchmark with at least 10 cases, targeting all 15.
- [ ] At least one benchmark chart.
- [ ] Backend and frontend deployed.
- [ ] README and demo video.

## Complete after the core works

- [ ] Full 15-case benchmark with repeated runs.
- [ ] Time-travel slider and historical reconstruction.
- [ ] TTL and lifecycle consolidation.
- [ ] Cascade forgetting and export.
- [ ] Entity Graph.
- [ ] W4 and W5 workflows.
- [ ] Additional benchmark charts.

## Stretch goals

- [ ] MCP server.
- [ ] Slack approval integration.
- [ ] Alternative embedding provider.
- [ ] Independent second-vendor benchmark judge.

---

# 12. Final demonstration sequence

The team should build toward the exact demonstration described in the blueprint.

| Time | Demonstration | Responsible member |
|---|---|---|
| 0:00–0:20 | Explain the problem and ANCHOR | All |
| 0:20–0:50 | Enter preferences and constraints; show memory inspector | Member 1 + 2 |
| 0:50–1:20 | Simulate alert and approve through Telegram | Member 3 |
| 1:20–1:50 | Simulate deployment; compare none, naive and governed | All |
| 1:50–2:15 | Submit poisoned note and show quarantine | Member 1 + 2 |
| 2:15–2:35 | Show time-travel slider | Member 2 |
| 2:35–2:50 | Show benchmark comparison chart | Member 3 + 2 |
| 2:50–3:00 | Explain MongoDB and n8n architecture | All |

---

# 13. Final definition of completion

ANCHOR is ready for submission when the following end-to-end scenario works:

1. A user tells the copilot a fact or preference.
2. The backend extracts it and decides whether to add or update memory.
3. The dashboard shows the saved memory and its trust level.
4. A new contradictory fact arrives.
5. The old memory is superseded or quarantined according to trust rules.
6. An alert arrives through n8n.
7. The copilot proposes a fix using relevant memories.
8. A human approves or rejects the proposal through Telegram.
9. A deployment event arrives and affected memories become stale.
10. The same question is tested in none, naive and governed modes.
11. The governed mode avoids blindly using stale or poisoned information.
12. The benchmark displays the results.

**The most important team objective:** Do not build three separate applications that only work individually. Build one connected system in which the React dashboard, backend memory engine, AI copilot, MongoDB and n8n work together.