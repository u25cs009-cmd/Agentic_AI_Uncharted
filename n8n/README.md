# n8n Automation Workflows for Engram (ANCHOR)

This directory contains production-ready JSON workflow definitions for **n8n Community Edition** or **n8n Cloud**, automating external incident intake, deployment staleness invalidation, quarantine security alerts, and periodic temporal lifecycle consolidation.

---

## 1. Environment Variables & Workflow Variables

Set the following variables inside your n8n workspace under **Variables** (accessible via `$vars`):

| Variable Name | Required | Description | Example Value |
|---|---|---|---|
| `ENGRAM_API_URL` | **Yes** | Root URL of the Engram backend API | `https://anchor-backend.onrender.com` or `http://localhost:5000` |
| `ENGRAM_SHARED_SECRET` | **Yes** | Shared authentication secret for webhook routes (`x-engram-secret` header) | `engram_shared_secret_sample` |
| `NOTIFY_WEBHOOK_URL` | Optional | Webhook URL for external operator notifications (Slack, Discord, custom webhook) | `https://webhook.site/sample-guid` |

---

## 2. Workflows Overview

### **WF1: Alert Intake & Governance (`WF1_alert_intake.json`)**
- **Trigger:** Webhook POST `/webhook/alert`
- **Routing:** Dispatches payload to Engram `/api/agent/triage` with `x-engram-secret: {{ $vars.ENGRAM_SHARED_SECRET }}`
- **Action:** Runs LLM extraction, vector embedding, and deterministic trust gating; returns the diagnosis, fix proposal, confidence, and cited memories back to the caller.

### **WF2: Deploy Sweeper (`WF2_deploy_sweeper.json`)**
- **Trigger:** Webhook POST `/webhook/deploy`
- **Routing:** Dispatches deployment event to Engram `/api/events/deploy` with `x-engram-secret: {{ $vars.ENGRAM_SHARED_SECRET }}`
- **Action:** Identifies affected code components and marks legacy procedural fixes as `stale` (`validity: 0.15`). If `staleCount > 0`, optionally notifies `NOTIFY_WEBHOOK_URL`.

### **WF3: Quarantine Notice (`WF3_quarantine_notice.json`)**
- **Trigger:** Webhook POST `/webhook/quarantine-notice`
- **Routing:** When an adversarial payload or prompt injection is isolated by the trust gate, dispatches a security alert payload to `NOTIFY_WEBHOOK_URL`.

### **WF4: Expiry Sweep (`WF4_expiry_sweep.json`)**
- **Trigger:** Scheduled Cron Trigger (hourly: `0 * * * *`)
- **Routing:** Dispatches POST `/api/lifecycle/consolidate` with `x-engram-secret: {{ $vars.ENGRAM_SHARED_SECRET }}`
- **Action:** Demotes aged hot memories to cold tier, cascades expired records past TTL, and records lifecycle audit events.

---

## 3. How to Import Workflows into n8n

1. Open your n8n web console (`http://localhost:5678` or your hosted n8n instance).
2. Go to **Workflows** → click **Add Workflow** (or **+**).
3. In the top-right menu (three dots `⋮`), click **Import from File**.
4. Select one of the JSON files:
   - `n8n/WF1_alert_intake.json`
   - `n8n/WF2_deploy_sweeper.json`
   - `n8n/WF3_quarantine_notice.json`
   - `n8n/WF4_expiry_sweep.json`
5. Verify variables: Ensure `$vars.ENGRAM_API_URL` and `$vars.ENGRAM_SHARED_SECRET` are configured.
6. Toggle the workflow to **Active**.

---

## 4. Trigger Payloads & Example curl Commands

### Trigger WF1: Incident Alert Intake
```bash
curl -X POST "https://<your-n8n-instance>/webhook/alert" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "payments-api",
    "severity": "P1",
    "message": "payments-api connection pool exhausted, saturation 100%",
    "component": "pg-pool",
    "environment": "production"
  }'
```
**Expected Response:** HTTP 200 with structured triage diagnosis, proposed fix, and confidence score.

---

### Trigger WF2: Deployment Invalidation Sweeper
```bash
curl -X POST "https://<your-n8n-instance>/webhook/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "checkout-api",
    "version": "v2.1.0",
    "environment": "production",
    "changed_components": ["pg-pool", "db-conn"]
  }'
```
**Expected Response:** HTTP 200 with `staleCount` reflecting memories marked stale.

---

### Trigger WF3: Quarantine Security Notice
```bash
curl -X POST "https://<your-n8n-instance>/webhook/quarantine-notice" \
  -H "Content-Type: application/json" \
  -d '{
    "memoryId": "mem-poison-001",
    "reason": "Hard prompt injection pattern detected in payload",
    "risk": "malicious"
  }'
```

---

### Trigger WF4: Manual Lifecycle Consolidation Sweep
```bash
curl -X POST "http://localhost:5000/api/lifecycle/consolidate" \
  -H "Content-Type: application/json" \
  -H "x-engram-secret: <YOUR_ENGRAM_SHARED_SECRET>"
```
