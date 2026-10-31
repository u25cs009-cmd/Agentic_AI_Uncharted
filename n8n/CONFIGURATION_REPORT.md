# ANCHOR — n8n Automation Workflows Configuration Report

## 1. Executive Summary

This report documents the completion, reconfiguration, and backend integration of all four **ANCHOR** n8n automation workflows. 

The workflows have been aligned with the completed ANCHOR backend routes, models, and authentication middleware. All OpenAI nodes have been replaced with **Google Gemini (`models/gemini-3.5-flash-lite`)**, known bugs in multi-chunk aggregation and patch generation have been resolved, and all database interactions are routed strictly through authenticated backend REST APIs.

---

## 2. Inventory of Modified & Reconfigured Workflows

| Original File | Updated File Name | Node Count | AI Model Provider | Status |
| :--- | :--- | :---: | :--- | :---: |
| `WF1_memory_creation.json` | `WF1_memory_creation.json` | 20 | Google Gemini 2.5 Flash | **READY (active: false)** |
| `WF2_memory_retrieval.json` | `WF2_memory_retrieval.json` | 13 | Google Gemini 2.5 Flash | **READY (active: false)** |
| `WF3_memory_update_deletion.json` | `WF3_memory_management.json` | 18 | Google Gemini 2.5 Flash | **READY (active: false)** |
| `WF4_temporary_memory_expiration.json`| `WF4_temporary_memory_expiration.json` | 8 | None (Deterministic) | **READY (active: false)** |

*Backups of previous iterations are archived in `n8n/backup/`.*

---

## 3. Node Configuration & Corrections Summary

### WF1 — Intelligent Memory Creation (`WF1_memory_creation.json`)
- **Node `Google Gemini Model - Extractor`**: Replaced OpenAI with `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` set to `models/gemini-3.5-flash-lite`.
- **Node `Google Gemini Model - Governance`**: Replaced OpenAI with `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` set to `models/gemini-3.5-flash-lite`.
- **Node `Search Similar Memories`**: Updated destination route to `POST /api/retrieve` passing `{ "query": "..." }` with headers `Authorization: Bearer <token>` and `x-internal-key`.
- **Node `Commit New Memory (ADD)`**: Configured to `POST /api/ingest` with payload `{ "text": "...", "source": { "kind": "user_stated", "actor": "..." } }`.
- **Node `Patch Existing Memory (UPDATE)`**: Configured to `PATCH /api/memories/:id` with payload `{ "content": "...", "value": "...", "expires_at": "...", "reason": "..." }`.
- **Node `Supersede Memory (SUPERSEDE)`**: Configured to `POST /api/ingest` which triggers the backend's deterministic superseding and audit event logging.
- **Node `File Quarantine Record (QUARANTINE)`**: Configured to `PATCH /api/memories/:id` with `{ "status": "quarantined", "quarantine_reason": "..." }`.
- **Node `Aggregate Step Result` (Bug Fix)**: 
  - **Issue Resolved**: Previously used `$('Parse Governance Decision').first().json`, causing all subsequent chunks in a message to reuse chunk #1's decision.
  - **Correction**: Replaced with item-scoped evaluation (`$('Parse Governance Decision').item.json`), preserving distinct governance actions, chunk indices, and memory IDs across all iterations.

### WF2 — Intelligent Memory Retrieval (`WF2_memory_retrieval.json`)
- **Node `Google Gemini Model - Query Parser`**: Replaced OpenAI with `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` (`models/gemini-3.5-flash-lite`).
- **Node `Google Gemini Model - Re-ranker`**: Replaced OpenAI with `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` (`models/gemini-3.5-flash-lite`).
- **Node `Backend Hybrid Retrieval`**: Connected to `POST /api/retrieve` with payload `{ "query": "{{ $json.extracted_keywords.join(' ') || $json.query_text }}" }`.
- **Node `Candidates Found?`**: Evaluates `{{ ($json.retrieved || []).length > 0 }}`. If empty, routes to `Build Empty Context` with zero hallucinations.

### WF3 — Memory Update and Deletion (`WF3_memory_management.json`)
- **Node `Google Gemini Model - Command Classifier`**: Replaced OpenAI with `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` (`models/gemini-3.5-flash-lite`).
- **Node `Google Gemini Model - Patch Generator`**: Replaced OpenAI with `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` (`models/gemini-3.5-flash-lite`).
- **Node `Search Target Memory in Backend`**: Connected to `POST /api/retrieve` to search active memories using semantic tokens.
- **Node `Parse & Sanitize Patch` (New Sanitization Node - Bug Fix)**:
  - **Issue Resolved**: Previously, raw LLM output `{{ $json.text }}` was inserted directly into the HTTP body, which risked failing backend JSON validation if Markdown fences (```` ```json ````) were returned.
  - **Correction**: Added dedicated sanitization node that strips Markdown code fences, parses valid JSON, and validates fields (`content`, `value`, `entities`, `reason`) before the PATCH request.
- **Node `Execute Backend Patch`**: Configured to `PATCH /api/memories/{{ $json.target_memory_id }}`.
- **Node `Execute Soft-Delete`**: Configured to `DELETE /api/memories/{{ $json.target_memory_id }}` (calls backend `deleteMemory`, which cascades to derived memories and logs an immutable tombstone event).
- **Node `Record Operation Audit Log`**: Connected to `POST /api/outcomes` passing `{ "memory_id": "...", "action": "APPROVED", "feedback_source": "n8n WF3 Memory Manager", "user_id": "..." }`.

### WF4 — Automatic Temporary Memory Expiration (`WF4_temporary_memory_expiration.json`)
- **Schedule**: Cron trigger set to daily at 02:00 UTC (`0 2 * * *`).
- **Zero LLM Nodes**: Fully deterministic; consumes zero Gemini tokens.
- **Node `Query Active Memories`**: Sends `GET /api/memories?status=active`.
- **Node `Verify Expiration & Filter Permanent`**: Defensive filter checking `mem.expires_at !== null` and `new Date(mem.expires_at) <= sweep_reference_time`. Permanent memories (`expires_at: null`) are excluded.
- **Node `Execute Backend Consolidation`**: Sends `POST /api/lifecycle/consolidate` which triggers the backend consolidator: transitions expired items to `status: 'stale'`, marks events with actor `'ANCHOR Lifecycle Consolidator (W4)'`, and demotes stale records to `tier: 'archive'`.

---

## 4. Real Backend API Endpoints Used

All requests point to the backend route tree mounted under `/api/`:

| Method | Endpoint | Authenticated In Backend By | Used in Workflow |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/retrieve` | `authenticateUser` / `x-internal-key` | WF1, WF2, WF3 |
| `POST` | `/api/ingest` | `authenticateUser` / `x-internal-key` | WF1 (ADD, SUPERSEDE) |
| `GET` | `/api/memories` | `authenticateUser` | WF4 (Active Memory Sweep) |
| `PATCH` | `/api/memories/:id` | `authenticateUser` | WF1 (UPDATE, QUARANTINE), WF3 (UPDATE) |
| `DELETE`| `/api/memories/:id` | `authenticateUser` | WF3 (DELETE / FORGET Cascade) |
| `POST` | `/api/lifecycle/consolidate` | `authenticateUser` | WF4 (Consolidate & Expire) |
| `POST` | `/api/outcomes` | `requireInternalKey` (`x-internal-key`) | WF3 (Audit Logging) |

---

## 5. Security & Zero Secret Embedding Confirmation

> [!IMPORTANT]
> **No API keys, database connection strings, passwords, or JWT secrets are embedded in the workflow JSON files.**

- **Backend Base URL**: Defaults to `https://agentic-ai-uncharted.onrender.com` via expression:
  `{{ $env.BACKEND_BASE_URL || 'https://agentic-ai-uncharted.onrender.com' }}`
- **Backend Service Token**:
  `Authorization: Bearer {{ $env.BACKEND_API_KEY || '' }}`
- **Internal API Key Header**:
  `x-internal-key: {{ $env.INTERNAL_API_KEY || '{{ $vars.ENGRAM_SHARED_SECRET }}' }}`
- **Gemini Credentials**: References the standard credential identifier `googlePalmApiCredential`.

---

## 6. Manual Steps Required in n8n Cloud Interface

Once you import the JSON files into n8n Cloud:

1. **Attach the Gemini Credential**:
   - In each of WF1, WF2, and WF3, open the workflow canvas.
   - Click each **Google Gemini Model** sub-node (e.g. `Google Gemini Model - Extractor`, `Google Gemini Model - Query Parser`, etc.).
   - In the **Credential for Google Gemini** dropdown, select your existing Google Gemini API credential.
2. **Configure Environment Variables in n8n Cloud**:
   - In your n8n Cloud dashboard, go to **Settings** $\to$ **Environment Variables**.
   - Ensure the following variables are present:
     - `BACKEND_BASE_URL`: `https://agentic-ai-uncharted.onrender.com` (or your live Render backend URL).
     - `BACKEND_API_KEY`: Your JWT bearer service token (if auth enforcement is enabled).
     - `INTERNAL_API_KEY`: `{{ $vars.ENGRAM_SHARED_SECRET }}`.
3. **Webhook URLs**:
   - Upon setting the workflows to **Active**, copy the production webhook URLs to your backend or client config:
     - `https://<your-n8n-instance>.app.n8n.cloud/webhook/memory-create`
     - `https://<your-n8n-instance>.app.n8n.cloud/webhook/memory-retrieve`
     - `https://<your-n8n-instance>.app.n8n.cloud/webhook/memory-manage`

---

## 7. Verification & Readiness Assessment

- **Syntax & Schema**: All 4 JSON files passed automated verification with 0 parse errors.
- **Node Connections**: All branch conditions (`ADD`, `UPDATE`, `SUPERSEDE`, `QUARANTINE`, `IGNORE`, `AMBIGUOUS`, `NOT_FOUND`, `EXACT_UPDATE`, `EXACT_DELETE`) correctly connect to their handler nodes.
- **Database Isolation**: **Zero direct MongoDB nodes**. All database mutations go strictly through the ANCHOR backend API.
- **Activation Status**: All workflows have `"active": false` set to ensure safe, controlled deployment.
