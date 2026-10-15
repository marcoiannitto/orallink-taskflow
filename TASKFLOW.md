# TaskFlow Technical Documentation

**Deployed at:** [tasks.orallink.health](https://tasks.orallink.health)
**Repo:** [github.com/marcoiannitto/orallink-taskflow](https://github.com/marcoiannitto/orallink-taskflow)
**Hosting:** Vercel (Hobby plan)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.4.1 |
| Language | TypeScript | 5.x |
| Runtime | React | 19.3.0 |
| Styling | Tailwind CSS | 4.x |
| Database | Airtable (SDK) | 0.12.2 |
| AI | Anthropic SDK (Claude Haiku 5.5) | 0.134.0 |
| Email | Resend | 6.33.0 |
| Auth | jsonwebtoken (JWT) | 9.0.3 |

---

## Next.js 16 Breaking Changes

This project uses Next.js 16, which has critical differences from v14/v15:

- **`proxy.ts` replaces `middleware.ts`**: the file is `src/proxy.ts`, and the export is `proxy` (not `middleware`).
- **`jsonwebtoken` does NOT work in Edge Runtime**: the proxy only checks cookie existence. JWT verification happens server-side in API routes.
- **Read the docs**: before writing code, check `node_modules/next/dist/docs/` for current API conventions.

---

## Project Structure

```
src/
  proxy.ts                    # Auth proxy (was middleware.ts in older Next.js)
  lib/
    constants.ts              # Design tokens, Airtable field IDs, team members
    auth.ts                   # JWT auth: login, token create/verify, getCurrentUser
    airtable.ts               # Airtable SDK wrapper: CRUD for tasks, clients, team
    ai-summary.ts             # Claude-powered note summarization for emails
  components/
    NavBar.tsx                # Top nav with OralLink logo, tabs, user info
  app/
    layout.tsx                # Root layout
    page.tsx                  # Redirects to /dashboard
    globals.css               # Global styles (no dark mode)
    icon.png                  # Favicon (tooth icon)
    login/page.tsx            # Login page
    dashboard/page.tsx        # Main chat interface (AI input)
    tasks/page.tsx             # Task list view
    pipeline/page.tsx          # Kanban pipeline view
    api/
      auth/login/route.ts     # POST: authenticate, set JWT cookie
      auth/logout/route.ts    # POST: clear cookie
      auth/me/route.ts        # GET: return current user from JWT
      parse/route.ts          # POST: AI parses natural language into structured action
      confirm/route.ts        # POST: execute parsed action (create/update in Airtable + email)
      tasks/route.ts          # GET: list tasks, PATCH: update task status
      clients/route.ts        # GET: list clients
      cron/route.ts           # GET: daily cron for reminders (Vercel cron)
public/
  logo-white.png              # White logo on transparent (nav, login)
  logo-dark.png               # Black logo on transparent
  logo-tooth.png              # Tooth icon (avatars, watermark)
  logo-square.png             # White logo on blue square
```

---

## Authentication

Simple JWT-based auth with hardcoded team members.

- **Password**: `orallink2026` (shared across all users)
- **Cookie**: `token`, httpOnly, 7-day expiry
- **Flow**: `proxy.ts` checks cookie exists on all routes except `/login` and `/api/auth/*`. API routes call `getCurrentUser()` which verifies the JWT server-side.
- **Team members** are defined in `constants.ts` with name, role, email, and Airtable `recordId`.

### Team Members

| Name | Role | Email | Record ID |
|------|------|-------|-----------|
| Marco | COO | marco@orallink.health | reccUGXtnEVZUWj6X |
| Jeremy | CFO | jeremy@orallink.health | rec6dRcjDvG5l1WTg |
| Glenn | CEO | glenn@orallink.health | recBToP1ZSFnooWIL |
| Gerald | COO | gerald@orallink.health | rec1TBtic3r5086Oq |
| Matthew | Intern | matthew@orallink.health | recdYW5szjOfXWSKH |
| Yee Kai | Intern | yeekai@orallink.health | recCwwb5ou2nBZ4wW |

---

## Airtable Schema

**Base ID:** `appS0SeEmjrtNYcIG`

### Important: Field ID vs. Field Name

The Airtable SDK `r.get()` uses field **names** by default. This project passes `returnFieldsByFieldId: true` in all select options and uses field IDs from `constants.ts`. This is critical for consistency.

### Tables

#### Clients (`tbl4yCDp1KnCSGHZM`)

| Field | ID | Type |
|-------|----|------|
| Name | fldPsiV6zBEI4QJD9 | Single line text |
| Status | fldpG3pEiQHzNxWfB | Single select (Exploration, MOU, Pilot, Onboarded, Active, Inactive) |
| Notes | fldayk1MiygtAmbfW | Long text |
| Next Follow-up | fldrYWVJOwp33QDM6 | Date |
| Oral Link Reference | fldJlDktDTUeVEBgd | **Linked record to Team table** (multiple) |
| Contact Name | fldr8GFuibA7VUWYS | Single line text |
| Contact Email | fldFfilMdwdiVbhhF | Email |
| Client Type | fldeQ8DgQjiWW7DIT | Single select |
| Pilot Date | fldv3FHTtbhYRWIG5 | Date |
| Launch Date | fldT5S39Ez6a2nFkO | Date |
| Scans/Month | fldEeK6ajyZIkoRsl | Number |
| Price | fldRsR0OBwpoZnX4R | Currency |
| Billing Cycle | fldbpszRVxJyRHo0U | Single select |
| Date Created | fldpEqVjbTLh3anbZ | Date |
| Billing Email | fldMSDYd5t3SUAeSa | Email |
| UEN | fldEPeQNiaMU21vuw | Single line text |
| Email Domain | fldAcLlXkhd5K1eqU | Single line text |
| Welcome Email Sent | fldvvSR0vPNxZdcFE | Checkbox |
| Welcome Email Date | fldSBp7zJKVRnQUZD | Date |
| Tasks | fldDQv9uYFZwSuFTc | Linked record |

#### Tasks (`tbldt0lsrKzPJBt6i`)

| Field | ID | Type |
|-------|----|------|
| Task | fldAUDoNyDdxdKonq | Single line text |
| Clients | fldFXXKzU5Wcw9SIh | Linked record |
| Responsible | fld6watjR7v0bq7ef | Single line text |
| Due Date | fldfhIUTQAWsVCIlh | Date |
| Status | fldk2YWG5pSF4AtkV | Single select (Open, In Progress, Done) |
| Priority | fldftvYX4gX9y3Dby | Single select (High, Medium, Low) |
| Type | fld6xJGXMtvJsiTr2 | Single select (CRM Follow-up, Reminder, To-do, Other) |
| Description | fldGc1eYxA8Wh6kUe | Long text |
| Notification Sent | fldmHjBalWFA290wV | Checkbox |
| Source Input | fldmVSKd9AqXjJhQC | Long text |
| Created By | fldDjwNasmlBRqKll | Single line text |

#### Team (`tbl38zi1EdOYSVHTf`)

| Field | ID | Type |
|-------|----|------|
| Name | fldJGyR9jcnZdZUx3 | Single line text |
| Role | fld3pPjabHj6ap0oi | Single line text |
| Email | fldzbie6sd4ux5WQ3 | Email |
| Phone | fldTvYQx1gbA9pMaK | Phone |

---

## Core Flow: Natural Language to Action

```
User types text
       |
       v
  /api/parse (POST)
  - Fetches all clients + user's tasks from Airtable for context
  - Sends to Claude Haiku 5.5 with system prompt containing:
    * Current user info
    * Full client list with IDs, status, responsible, notes
    * Recent tasks
    * Team members
  - Supports multi-turn: receives `history` array of previous messages
  - Returns structured JSON:
    { intent, client_match, client_name, title, assigned_to,
      due_date, priority, type, status_update, notes_append,
      description, notify, clarification_needed, ... }
       |
       v
  Dashboard shows confirmation card (editable)
  User clicks Confirm / Edit / Discard
       |
       v
  /api/confirm (POST)
  - Executes the parsed action:
    * create_task: creates task in Airtable
    * create_client: creates client, saves responsible list (as linked record IDs),
      sends email notification with AI-summarized next steps
    * update_client: updates fields, appends notes with datestamp,
      reads stored responsible list for email recipients,
      sends email notification
  - Email recipients priority: explicit notify list > stored responsible > current user
```

### AI Model Notes

- **Model**: `claude-haiku-5-5` (valid model IDs: `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`)
- Haiku 5.5 returns "thinking" blocks before text blocks. Always use `.find(b => b.type === 'text')` to extract the response.
- Haiku 5.5 does NOT support assistant message prefill.
- Fuzzy matching is critical in the system prompt: the AI matches partial names, abbreviations, typos to existing clients before creating new ones.

---

## Multi-Person Responsible Field

The "Oral Link Reference" field on clients is a **linked record field pointing to the Team table**. It supports multiple entries.

### How it works:

- **Reading**: Airtable returns an array of record IDs (e.g. `['reccUGXtnEVZUWj6X', 'rec6dRcjDvG5l1WTg']`). The `resolveResponsible()` function in `airtable.ts` maps these to team member names using `TEAM_MEMBERS[].recordId`.
- **Writing**: The `namesToRecordIds()` function converts name strings back to record IDs for Airtable writes.
- **Email notifications**: When updating a client, if no explicit `notify` list is provided, the system reads the stored responsible list from the client record and emails everyone on it. This means editing the responsible field directly in Airtable also controls who gets emails.
- **Cron**: The daily cron (`/api/cron`) emails ALL responsible people for each client due for follow-up, not just one.

---

## Email Notifications (Resend)

Emails are sent via Resend in two contexts:

1. **On client create/update** (`confirm/route.ts`): AI-summarized next steps, status changes, follow-up dates. Uses OralLink branded HTML template.
2. **Daily cron** (`cron/route.ts`): Task reminders (due soon, not yet notified) and client follow-up reminders. Runs at 8:00 AM UTC daily (`vercel.json` cron).

**Note**: Vercel Hobby plan only supports daily cron jobs (not hourly).

The `ai-summary.ts` module calls Claude Haiku 5.5 to generate 2-3 bullet points of next steps from client notes, used in notification emails.

---

## Frontend Pages

### Login (`/login`)
- Dark #153543 background with dot pattern overlay
- White OralLink logo centered, "TaskFlow" divider
- White card with email/password form
- Blue (#49A3CC) submit button
- "Powered by Kells" footer

### Dashboard (`/dashboard`)
- Chat-style interface: user messages right, assistant messages left
- Tooth icon avatar for assistant messages
- Bouncing dots loader animation
- AI parses input and shows a confirmation card with:
  - View mode: read-only preview of parsed data
  - Edit mode: editable fields (text inputs, selects, date pickers)
  - Confirm / Edit / Discard buttons
- Toast notification on save
- Multi-turn conversation support (history passed to AI)
- StatusBadge component with per-stage colors

### Tasks (`/tasks`)
- Filterable task list (All / My Tasks, status filter)
- Done checkmark circles in blue (#49A3CC)
- Overdue tasks highlighted with coral border
- Priority badges (red/amber/green), type badges in light blue
- Click checkmark to mark done

### Pipeline (`/pipeline`)
- Kanban board with 6 columns: Exploration, MOU, Pilot, Onboarded, Active, Inactive
- Each column has a colored accent bar and count
- Client cards show responsible people as blue pills
- Click card to open detail modal with all fields
- Backdrop-blur modal with close button

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Dark Teal | #153543 | Nav, headers, text |
| Blue | #49A3CC | Buttons, links, active states |
| Coral | #FF6F59 | Errors, overdue, discard |
| Green | #A3D9A5 | Success, active status |
| Light Blue BG | #E2F0F6 | Badges, pills, highlights |
| Light Gray BG | #F7F7F7 | Page background |
| Border Gray | #D1D5DB | Card borders, inputs |
| Border Hover | #E5E7EB | Lighter borders |

- **Font**: Trebuchet MS, Arial fallback
- **No dark mode**
- **Mobile-first** responsive design

### Status Colors (Pipeline + Badges)

| Stage | Color |
|-------|-------|
| Exploration | Purple |
| MOU | Blue |
| Pilot | Amber |
| Onboarded | Teal |
| Active | Green |
| Inactive | Gray |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| AIRTABLE_API_KEY | Yes | Airtable personal access token |
| ANTHROPIC_API_KEY | Yes | Anthropic API key for Claude |
| RESEND_API_KEY | Yes | Resend API key for emails |
| RESEND_FROM_EMAIL | No | Sender email (default: taskflow@orallink.health) |
| JWT_SECRET | No | JWT signing secret (default: orallink-taskflow-dev-secret) |
| CRON_SECRET | Yes | Bearer token for cron endpoint auth |

**Note**: Env vars are not available during `next build` data collection phase. The app works on Vercel where env vars are set at runtime. Local builds may fail at the page data collection step with "An API key is required to connect to Airtable".

---

## Known Gotchas

1. **Build error**: TypeScript compiles fine (7.2s) but the page data collection step fails locally because env vars are missing. Works on Vercel.
2. **Airtable field access**: Always use `returnFieldsByFieldId: true` and field IDs from `constants.ts`. Using field names will break if fields are renamed in Airtable.
3. **Claude Haiku 5.5 thinking blocks**: The model returns thinking blocks before text. Always filter with `.find(b => b.type === 'text')`.
4. **No assistant prefill**: Haiku 5.5 does not support starting the assistant response with a partial message.
5. **Linked record writes**: The CLIENT_RESPONSIBLE field expects an array of record IDs, not names. Use `namesToRecordIds()` from `airtable.ts`.
6. **Notes are append-only**: `confirm/route.ts` always appends new notes with a datestamp prefix, never replaces existing notes.
7. **Vercel Hobby cron**: Only supports `0 8 * * *` (daily). Hourly or more frequent is not available on Hobby.
