# OralLink TaskFlow

AI-powered task manager and CRM for OralLink's founding team.

**Live:** [tasks.orallink.health](https://tasks.orallink.health)  
**Hosting:** Vercel (Hobby plan, auto-deploy on push to `main`)

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in API keys (see below)
npm run dev                   # http://localhost:3000
```

> **Note:** `next build` will fail locally without env vars — this is expected. Use `npx tsc --noEmit` for local type-checking. Builds work on Vercel where env vars are set at runtime.

## Environment Variables

Create `.env.local` for local dev, or set in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_API_KEY` | **Yes** | Airtable personal access token |
| `AIRTABLE_BASE_ID` | No | Defaults to `appS0SeEmjrtNYcIG` |
| `ANTHROPIC_API_KEY` | **Yes** | Anthropic API key (Claude) |
| `RESEND_API_KEY` | **Yes** | Resend email API key |
| `RESEND_FROM_EMAIL` | No | Defaults to `taskflow@orallink.health` |
| `JWT_SECRET` | Recommended | JWT signing secret |
| `CRON_SECRET` | **Yes** | Bearer token for `/api/cron` endpoint |
| `AIRTABLE_ACTIVITY_TABLE_ID` | No | Auto-created via admin Settings page |

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.4.1 |
| Language | TypeScript | 5.x |
| UI | React | 19.3.0 |
| Styling | Tailwind CSS | 4.x |
| Database | Airtable (SDK) | 0.12.2 |
| AI | Anthropic SDK (Claude Haiku 5.5) | ^0.134.0 |
| Email | Resend | ^6.33.0 |
| Auth | jsonwebtoken (JWT) | ^9.0.3 |

## Architecture Overview

```
User types natural language
  → /api/parse sends to Claude with Airtable context
  → Returns structured JSON (intent, client, task, dates…)
  → User confirms/edits on dashboard
  → /api/confirm writes to Airtable + sends email
  → /api/cron runs daily at 08:00 UTC for reminders
```

### Key Design Decisions

- **Next.js 16** uses `proxy.ts` (not `middleware.ts`). `jsonwebtoken` doesn't work in Edge Runtime, so the proxy only checks cookie existence — JWT verification happens in API routes.
- **Airtable SDK** is lazy-initialized to avoid build-time errors when env vars aren't set.
- **All Airtable queries** use `returnFieldsByFieldId: true` with field IDs from `src/lib/constants.ts` — never field names.
- **Three permission tiers**: admin, member, intern — defined in `constants.ts` with a numeric hierarchy.
- **Email triggers**: (1) immediately on confirm via dashboard, (2) daily cron for overdue tasks/client follow-ups. No real-time Airtable change detection.

## Project Structure

```
src/
  proxy.ts                    # Auth proxy (checks cookie exists)
  lib/
    constants.ts              # Colors, Airtable IDs, team members, permissions
    auth.ts                   # JWT: login, verify, getCurrentUser, requireRole
    airtable.ts               # Airtable CRUD for tasks, clients, team
    ai-summary.ts             # Claude-powered note summarization
    activity.ts               # Activity log read/write
    email-templates.ts        # 4 branded email templates
  hooks/
    useCurrentUser.ts         # Client-side auth hook with permission check
  components/
    NavBar.tsx                # Permission-filtered navigation
  app/
    login/page.tsx            # Login page
    dashboard/page.tsx        # AI chat interface (core feature)
    tasks/page.tsx            # Task list with filters
    pipeline/page.tsx         # Kanban CRM pipeline
    activity/page.tsx         # Activity log
    settings/page.tsx         # Admin-only settings
    api/
      auth/login|logout|me/   # Authentication endpoints
      parse/route.ts          # AI natural language → structured JSON
      confirm/route.ts        # Execute action → Airtable + email
      tasks/route.ts          # Task CRUD
      clients/route.ts        # Client list
      cron/route.ts           # Daily email reminders
      activity/route.ts       # Activity log queries
      activity/setup/route.ts # Admin: create Activity Log table
```

## Auth

- **Password:** `OralLink123!@` (shared, all users)
- **Users:** 6 hardcoded team members in `constants.ts`
- **Permissions:** admin (Marco), member (Glenn, Gerald, Jeremy), intern (Matthew, Yee Kai)
- **Token:** JWT in httpOnly cookie, 7-day expiry

## Deployment

Push to `main` → Vercel auto-deploys. Cron job configured in `vercel.json`.

## Full Documentation

The complete developer handoff docs — Airtable schema with all field IDs, API route reference, AI integration details, email notification logic, and feature roadmap — are maintained in the Claude Project "Oral Link" under `claude/taskflow-technical-docs.md`.
