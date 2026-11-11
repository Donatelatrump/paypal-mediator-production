# ResolveAI — Unified Monorepo

This monorepo contains both the backend (NestJS) and frontend (React/Vite) for ResolveAI.

## Structure

```
paypal-mediator-production/
├── apps/
│   ├── api/          # Backend NestJS API
│   └── web/          # Frontend React/Vite Dashboard
├── packages/
│   └── contracts/    # Shared Zod schemas & types
├── docs/             # Architecture, modules, validation
├── .github/workflows/# CI/CD pipelines
├── render.yaml       # Render deployment config (backend)
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 24 LTS
- pnpm 10.34.9 (`npm install --global pnpm@10.34.9`)
- PostgreSQL (local or Supabase)

### Installation

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL, Supabase keys, PayPal credentials

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:deploy

# Start both API and Web in development
pnpm dev
```

Or start individually:

```bash
# Backend only (port 3001)
pnpm dev:api

# Frontend only (port 3000)
pnpm dev:web
```

### Environment Variables

**Root `.env` (Backend):**

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
SUPABASE_URL=https://cauossdmfgvbyjyjcdyz.supabase.co
SUPABASE_SECRET_KEY=...
EVIDENCE_BUCKET=private-evidence
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PORT=3001
```

**`apps/web/.env.local` (Frontend):**

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://cauossdmfgvbyjyjcdyz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Local URLs

| Service       | URL                                    | Description          |
| ------------- | -------------------------------------- | -------------------- |
| Frontend      | http://localhost:3000                  | React/Vite Dashboard |
| API Health    | http://localhost:3001/api/health       | Liveness check       |
| API Readiness | http://localhost:3001/api/health/ready | DB connectivity      |
| Swagger       | http://localhost:3001/api/docs         | API documentation    |

## Commands

```bash
# Full validation (lint, types, tests, build)
pnpm check

# Backend only
pnpm --filter @resolve-ai/api dev      # Start API in watch mode
pnpm --filter @resolve-ai/api build    # Build API
pnpm --filter @resolve-ai/api test     # Run backend tests

# Frontend only
pnpm --filter @resolve-ai/web dev      # Start React/Vite dev server
pnpm --filter @resolve-ai/web build    # Build for production
pnpm --filter @resolve-ai/web lint     # Lint frontend
pnpm --filter @resolve-ai/web typecheck # Type check

# Database
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Create new migration
pnpm db:deploy      # Apply migrations
pnpm db:validate    # Validate schema

# Contracts
pnpm --filter @resolve-ai/contracts build  # Build shared contracts
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for code organization.

### Backend Modules (M01–M09)

| Module                      | Folder                                 | Status        |
| --------------------------- | -------------------------------------- | ------------- |
| M01 Merchant & Integrations | `apps/api/src/modules/merchants`       | ✅ Deployed   |
| M02 Event Ingestion         | `apps/api/src/modules/event-ingestion` | ✅ Deployed   |
| M03 Transactions            | `apps/api/src/modules/transactions`    | ✅ Deployed   |
| M04 Evidence Vault          | `apps/api/src/modules/evidence`        | ✅ Deployed   |
| M05 Investigator            | `apps/api/src/modules/investigator`    | 🔧 Local only |
| M06 Verifier                | `apps/api/src/modules/verifier`        | 🔧 Local only |
| M07 Disputes                | `apps/api/src/modules/disputes`        | 🔧 Partial    |
| M08 Submissions             | `apps/api/src/modules/submissions`     | ✅ Deployed   |
| M09 Monitoring              | `apps/api/src/modules/monitoring`      | ✅ Deployed   |

### Frontend Pages

| Route           | Description                     |
| --------------- | ------------------------------- |
| `/`             | Overview dashboard with stats   |
| `/transactions` | Transaction list with readiness |
| `/disputes`     | Dispute management              |
| `/activity`     | Agent activity audit log        |
| `/settings`     | Merchant & PayPal configuration |
| `/login`        | Supabase Auth login             |

## Deployment

### Backend (Render)

The backend is deployed to Render at: https://resolve-ai-api-ybmj.onrender.com/api

Configuration in `render.yaml`. Auto-deploys on push to `main` when CI passes.

Required environment variables in Render dashboard:

- `DATABASE_URL`, `DIRECT_URL`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `CORS_ORIGIN` (set to your Vercel frontend URL)
- `NVIDIA_API_KEY` (for Investigator)

### Frontend (Vercel - Recommended)

1. Push this repo to GitHub
2. Import in Vercel, set root directory to `apps/web`
3. Add environment variables:
   - `VITE_API_URL` = `https://resolve-ai-api-ybmj.onrender.com/api`
   - `VITE_SUPABASE_URL` = `https://cauossdmfgvbyjyjcdyz.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase anon key
4. Deploy

Alternative: Deploy to Render as static site (see commented section in `render.yaml`).

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

- **validate-backend**: Lint, typecheck, unit tests, DB tests, build
- **validate-frontend**: Lint, typecheck, build
- **deploy-backend**: Auto-deploys to Render on main
- **deploy-frontend**: Deploys to Vercel on main (requires secrets)

## Supabase Project

- **Project**: `resolve-ai-backend` (ref: `cauossdmfgvbyjyjcdyz`)
- **Region**: us-east-1
- **Database**: PostgreSQL 17 on Supabase
- **Auth**: Supabase Auth (email/password)
- **Storage**: Private bucket `private-evidence` for evidence files

## PayPal Sandbox

- Environment: Sandbox only
- Webhook URL: `https://resolve-ai-api-ybmj.onrender.com/api/webhooks/paypal`
- Events: `PAYMENT.CAPTURE.COMPLETED`, `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`, `CUSTOMER.DISPUTE.RESOLVED`

## References

- [Product Context](information.md)
- [Architecture](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Validation Results](docs/validation.md)

### Frontend configuration

The canonical frontend is maintained in `paypal-mediator-frontend`; this workspace preserves its screens and uses the connected API adapter. Production defaults to live authentication and API data. Set `VITE_DATA_MODE=preview` explicitly for the local design preview. Existing Vercel `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables remain supported. Public configuration is embedded at build time; never supply a Supabase service role key.

Vercel must use the Vite framework preset and `apps/web` root directory. The checked-in configuration builds `dist` and rewrites direct screen URLs to the SPA entry point. Browser back/forward and existing transaction, dispute, activity, settings, and login callback URLs are supported.
