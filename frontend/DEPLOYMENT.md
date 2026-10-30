# ANCHOR Frontend Deployment Guide (Vercel)

## 1. Quick Deploy to Vercel

The frontend is built with **Vite + React 18 + TypeScript** and configured for single-page application (SPA) routing with `vercel.json`.

### Option A: Import via Vercel Web Dashboard (Recommended)
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select your repository: `Agentic_AI` (or `Agentic_AI_Uncharted`).
3. Set **Root Directory** to `frontend`.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add Environment Variable:
   - `VITE_API_BASE_URL`: Enter Member 1's live backend URL (e.g., `https://anchor-backend.onrender.com`).
   - *(Note: If Member 1's backend is not yet deployed, leave `VITE_API_BASE_URL` empty to automatically run in high-fidelity standalone demo mode).*
7. Click **Deploy**.

### Option B: Deploy via Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel
```

---

## 2. Environment Variables Configuration

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Optional (for live backend) | Points to Member 1's Express/Node.js API server. If omitted, the client runs in high-fidelity demo mode with full simulation of ANCHOR mathematical formulas and memory rules. |

---

## 3. SPA Routing & Rewrites

Direct routing to `/inspector`, `/explorer`, `/quarantine`, `/timeline`, `/entity-graph`, and `/benchmark` is configured via `frontend/vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

