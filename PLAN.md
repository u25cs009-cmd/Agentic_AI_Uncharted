# ANCHOR – Implementation Plan

Please refer to the complete, detailed master plan in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

It covers:
1. **Ground Rules & Core Philosophy** (Backend first, UI second, MongoDB last; 100% Free tiers; Cut-line strategy).
2. **The Architecture Pattern: "Database Last"** (`Repository` interface implemented by `InMemoryRepository` in Phases 1-6, and `MongoRepository` in Phase 7 via `STORE=memory` or `STORE=mongo`).
3. **Free Tool Stack** (Transformers.js 384d local embeddings, Gemini/Groq free tier with `llm.ts` caching, self-hosted n8n Community Edition, Telegram Bot, cloudflared/ngrok tunnels, MongoDB Atlas M0 with 2 search indexes & 2s poll fallback, Vercel & Render free hosting, Vitest + Supertest).
4. **Roles & Ownership** (Member A: Backend & Memory Engine Lead, Member B: Frontend & Demo Lead, Member C: Automation, Benchmark & Delivery Lead).
5. **Detailed Division of Work** (Module breakdown across Members A, B, and C).
6. **Phase-wise Implementation Plan (Phases 0 to 8)** with explicit "Done When" milestones and per-member task lists.
7. **Suggested Schedule & Timeline** (30 Oct to 31 Oct with hours).
8. **Cut-Line Strategy & Drop Order** (MCP server → Slack → Graph view → Consolidation → Time-travel slider → 10 cases).
9. **Team Working Agreements & Open Items**.
10. **Shared API Contracts & Schemas**.

