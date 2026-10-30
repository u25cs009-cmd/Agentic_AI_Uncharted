# ANCHOR – Detailed Implementation Plan
## Team Shakti-2 | Track 1: Agentic Memory

**Team size:** 3 members  
**Project:** ANCHOR – A Governed, Temporal, Explainable Memory Engine for AI Agents  
**Submission deadline in blueprint:** 10 PM, 31 October

---

# 1. Project objective

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

## 2. Final technology stack

Use the stack specified in the blueprint as the initial implementation stack.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Frontend libraries | TanStack Query, React Router, Recharts, React Flow, lucide-react, date-fns |
| Backend | Node.js 20, Express, TypeScript |
| Database | MongoDB Atlas |
| Database driver | Official MongoDB Node.js driver |
| Embeddings | OpenAI text-embedding-3-small |
| LLM | OpenAI chat models |
| Validation | Zod |
| Authentication | JWT + bcryptjs |
| Automation | n8n |
| Human approval | Telegram Bot |
| Live updates | Server-Sent Events (SSE) |
| Testing | Vitest + Supertest |
| Frontend hosting | Vercel |
| Backend hosting | Render or Railway |
| Automation hosting | n8n Cloud or Docker |

**Important:** MongoDB Atlas is central to the blueprint. Do not introduce Neo4j as another database. Use MongoDB collections and `$graphLookup` for entity relationships.

---

# 3. Division of work among three members

## Member 1 – Backend, Database and AI Memory Engine

**Primary responsibility:** Build the complete backend and the actual memory intelligence.

This member owns the most important part of the system: the logic that decides what the AI should remember and whether it should trust that information.

### Module 1: Backend project setup

Create the backend application using Node.js, Express and TypeScript.

Tasks:

1. Initialize the Node.js project.
2. Configure TypeScript and `tsx`.
3. Install the required dependencies.
4. Connect the backend to MongoDB Atlas.
5. Configure environment variables.
6. Create the Express application.
7. Add centralized error handling.
8. Add request validation using Zod.
9. Add security middleware.
10. Create a health-check endpoint.

Suggested dependencies:

- express
- mongodb
- zod
- jsonwebtoken
- bcryptjs
- helmet
- cors
- express-rate-limit
- pino
- openai
- p-limit
- nanoid
- dotenv

**Expected output:**

- Running backend server.
- Successful MongoDB connection.
- Working `/api/health` endpoint.
- Backend deployed to Render or Railway.

### Module 2: MongoDB database design

Create the collections specified in the blueprint.

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
  "embedding": [],
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

Create the following indexes:

- Owner + workspace + status index.
- Attribute key index.
- Vector Search index named `memory_vector`.
- Atlas Search index named `memory_text`.
- TTL index on `expires_at`.

For Vector Search, use 1536 dimensions and cosine similarity, as specified in the blueprint.

**Expected output:** MongoDB database with collections and indexes ready for backend operations.

### Module 3: Authentication and user isolation

Implement:

- `POST /api/auth/register`
- `POST /api/auth/login`

Tasks:

1. Register users.
2. Hash passwords using bcryptjs.
3. Generate JWT access tokens.
4. Verify JWT on protected routes.
5. Associate each memory with an owner and workspace.
6. Create a shared repository layer that automatically applies owner and workspace filters.

Security requirement:

User A must never be able to access User B's memories, even if User A knows the memory ID.

### Module 4: Governed memory write path – F1

This is the core feature.

Implement:

`POST /api/ingest`

Every incoming observation must pass through this pipeline:

```text
Incoming observation
        |
        v
Normalize input
        |
        v
Safety screening
        |
        v
Extract candidate facts
        |
        v
Find similar existing memories
        |
        v
LLM proposes a decision
        |
        v
Deterministic guard rules
        |
        v
Apply decision using transaction
        |
        v
Save memory event
        |
        v
Generate embedding asynchronously
```

The five possible decisions are:

| Decision | Meaning |
|---|---|
| ADD | Create a new memory |
| UPDATE | Refine an existing memory |
| SUPERSEDE | Replace an old fact while retaining its history |
| QUARANTINE | Keep suspicious or conflicting information out of normal retrieval |
| IGNORE | Discard duplicate or irrelevant information |

Implement the trust levels:

| Source | Trust |
|---|---:|
| human_approved | 1.00 |
| system_event | 0.85 |
| user_stated | 0.80 |
| agent_inferred | 0.50 |
| unverified | 0.20 |

Important rules:

- A lower-trust memory must never supersede a higher-trust memory.
- Suspicious instructions must be quarantined.
- Duplicate facts should be ignored.
- Superseded memories must retain their history.
- Every decision must have a reason.
- Memory changes and their corresponding events must be written transactionally.

**Expected output:** A working governed memory ingestion API.

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

## Member 2 – Frontend and Dashboard

**Primary responsibility:** Build the complete React dashboard and connect it to Member 1's APIs.

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

- API requests.
- JWT authentication headers.
- Error responses.
- Loading states.
- API response types.

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
- Abstention warning.
- Side-by-side comparison mode.

Example:

User asks:

"Which database are we currently using?"

The dashboard should allow the same question to be tested in all three modes.

Display the answers separately so the user can compare the behavior.

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

Create charts using Recharts:

1. Grouped comparison by scenario category.
2. Harmful-action rate by mode.
3. Confidence trajectory after repeated rejection feedback.

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

## Member 3 – n8n Automation, Benchmarking, Testing and Integration

**Primary responsibility:** Make ANCHOR work as an agentic system by connecting external events, human approvals, benchmark execution and the deployed components.

This member should not independently write memories directly into MongoDB. All memory-changing operations must go through Member 1's governed backend API.

### Module 1: n8n setup

Set up n8n using:

- n8n Cloud trial, or
- Docker on Render/Railway.

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
8. Include Approve and Reject buttons.
9. Save the workflow export in the GitHub repository.

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

1. No memory mode.
2. Naive memory mode.
3. Governed memory mode.

Repeat cases several times where possible to reduce the impact of LLM randomness.

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

# 4. Shared implementation schedule

The three members should work in parallel, but the work must follow the dependency order below.

## Phase 0 – Initial setup

**Time allocation: First 1 hour**

All three members work together.

| Member | Work |
|---|---|
| Member 1 | Create backend repository, connect MongoDB Atlas and create initial collections |
| Member 2 | Create React/Vite application and deploy a basic frontend |
| Member 3 | Set up n8n, Telegram bot and initial webhook |

Shared tasks:

- Create one GitHub repository.
- Configure `.gitignore`.
- Create `.env.example`.
- Add environment variables to hosting platforms.
- Confirm backend, frontend and n8n URLs.
- Agree on API request and response formats.

**Phase completion condition:** All three deployed URLs respond.

## Phase 1 – Core write path

**Priority: MUST**

| Member | Work |
|---|---|
| Member 1 | Implement observation normalization, safety screening, extraction, decisions, trust rules, transactions and events |
| Member 2 | Build dashboard layout, authentication and initial memory display |
| Member 3 | Prepare alert webhook and benchmark scenario fixtures |

**Completion condition:**

- A normal fact can be added.
- A changed fact can supersede an older fact.
- A suspicious fact is quarantined.
- Every decision has a reason.
- The memory event is recorded.

## Phase 2 – Retrieval and agent

**Priority: MUST**

| Member | Work |
|---|---|
| Member 1 | Implement vector search, keyword search, RRF, scoring, abstention and chat endpoint |
| Member 2 | Implement chat and Retrieval Inspector |
| Member 3 | Test retrieval scenarios and prepare W1 alert integration |

**Completion condition:**

- The agent can retrieve relevant memories.
- The score breakdown is correct.
- Low-confidence or stale memories are not blindly used.
- The inspector displays the retrieval decision.

## Phase 3 – None, naive and governed modes

**Priority: MUST**

| Member | Work |
|---|---|
| Member 1 | Implement three operating modes in `/api/chat` |
| Member 2 | Add mode toggle and side-by-side chat comparison |
| Member 3 | Prepare benchmark runner to execute all three modes |

**Completion condition:** The same query can be tested in all three modes.

## Phase 4 – n8n workflows

**Priority: MUST**

| Member | Work |
|---|---|
| Member 1 | Complete ingestion, deploy event and outcome APIs |
| Member 2 | Add Simulate Alert and Simulate Deploy controls |
| Member 3 | Complete W1, W2 and W3 |

**Completion condition:**

- Alert arrives.
- Backend processes it.
- Telegram receives the proposed action.
- Human approval or rejection is recorded.
- A deployment marks affected memories stale.

## Phase 5 – Dashboard integration

**Priority: MUST**

| Member | Work |
|---|---|
| Member 1 | Complete memory explorer, quarantine, events and SSE APIs |
| Member 2 | Complete Chat, Inspector, Explorer, Quarantine and Timeline |
| Member 3 | Test all API connections and event workflows |

**Completion condition:** Dashboard works with the deployed backend and shows live event updates.

## Phase 6 – Benchmark

**Priority: MUST**

| Member | Work |
|---|---|
| Member 1 | Complete benchmark execution and result storage APIs |
| Member 2 | Create benchmark charts and result screens |
| Member 3 | Complete 15 scenarios and run all three modes |

**Completion condition:**

- All 15 cases execute.
- Results are stored.
- The three operating modes are compared.
- Charts clearly show correct-action and harmful-action rates.

## Phase 7 – Advanced lifecycle and polish

**Priority: After the core demonstration works**

| Member | Work |
|---|---|
| Member 1 | Complete time-travel reconstruction, TTL, consolidation and cascade forgetting |
| Member 2 | Complete time-travel slider, Entity Graph and Settings/Privacy |
| Member 3 | Complete W4/W5, repeat benchmark runs and final verification |

**Completion condition:** Historical memory reconstruction, lifecycle operations and final demonstration are verified.

---

# 5. Shared API contract

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

These are illustrative contract examples. Member 1 should define the final validated schemas and share them with Members 2 and 3 before integration.

---

# 6. Recommended GitHub folder structure

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

# 7. Team collaboration rules

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

# 8. Final priority list

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

# 9. Final demonstration sequence

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

# 10. Final definition of completion

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

