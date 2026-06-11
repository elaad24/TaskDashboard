# Command Center

> A local-first, AI-powered personal command dashboard.
> Open the app -> know what matters now.

Command Center is a Jarvis-style operating system for your goals, tasks, study,
problems, logs and personal operations. You write messy thoughts into a single
command bar, and the **Navigator** AI classifies them into structured actions
that show up on a futuristic mission-control dashboard.

The app is fully **local-first**: a single SQLite file, no Docker, no cloud DB.
AI can run via OpenAI or a local Ollama model, and reminders can optionally flow through Telegram.

**Security note:** The API binds to `127.0.0.1` only and is intended for single-user local use. Do not expose it via `0.0.0.0`, tunnels, or deployment without adding authentication first.

---

## Tech stack

| Layer    | Tech                                                                    |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Radix UI primitives, Framer Motion, Lucide icons |
| Backend  | Node.js 20, Express, TypeScript, Zod, Pino, Helmet, express-rate-limit  |
| Database | SQLite + Prisma ORM (with FTS5 virtual tables for fast local search)     |
| AI       | OpenAI Node SDK with `response_format: json_schema` (structured outputs) |
| Tooling  | npm workspaces, concurrently, Prettier, TypeScript strict (acts as the lint gate) |

The repo is a small monorepo with three workspaces:

```
shared/   -> Zod schemas + types shared between client and server
server/   -> Express API + Prisma + Navigator AI
client/   -> React dashboard
```

---

## Quick start

### 1. Prerequisites

- **Node.js 20+** and **npm 10+**
- An **OpenAI API key** (or a local **Ollama** instance)

### 2. Install + configure

```bash
# from the repo root
cp .env.example server/.env

# Then edit server/.env and set OPENAI_API_KEY=sk-...
```

### 3. One-shot setup

```bash
npm run setup
```

This runs `npm install`, applies the Prisma migrations, and seeds the database
with realistic sample data (an Aviation area, PPL track, a few goals/tasks/logs)
so the dashboard is alive on first launch.

### 4. Run

```bash
npm run dev
```

This starts:

- the Express API at `http://localhost:4000`
- the Vite client at `http://localhost:5173`

Open `http://localhost:5173` in your browser. You should land on the **Command
Center** with the seed data already populated.

For a short in-app guide, open **Settings** and read the **Start here** section at the top.

---

## Useful scripts

```bash
npm run dev         # run client + server in parallel
npm run build       # production build (shared -> server -> client)
npm run start       # start the production server (serves built client)
npm run db:migrate  # apply Prisma migrations
npm run db:seed     # seed the database with sample data
npm run db:studio   # open Prisma Studio (DB GUI)
npm run db:reset    # nuke + recreate the DB and reseed
npm run lint        # alias for typecheck (TS strict acts as our lint gate)
npm run typecheck   # tsc --noEmit across workspaces
npm run format      # prettier --write
```

---

## Environment variables

All secrets live in `server/.env`. The client only reads `VITE_API_BASE_URL`
from its own `.env` (defaults to `http://localhost:4000`).

| Variable            | Required | Default                  | Purpose                           |
| ------------------- | -------- | ------------------------ | --------------------------------- |
| `OPENAI_API_KEY`    | Yes*     | -                        | Navigator AI (*required unless using Ollama only) |
| `OPENAI_MODEL`      | No       | `gpt-4o-mini`            | OpenAI model default              |
| `OLLAMA_BASE_URL`   | No       | `http://localhost:11434` | Ollama host (optional)            |
| `OLLAMA_MODEL`      | No       | `gemma3`                 | Ollama model default (Google Gemma) |
| `DATABASE_URL`      | Yes      | `file:./dev.db`          | SQLite path (resolved relative to `server/prisma/schema.prisma`, i.e. `server/prisma/dev.db`) |
| `PORT`              | No       | `4000`                   | API port                          |
| `NODE_ENV`          | No       | `development`            | `development` or `production`     |
| `CLIENT_ORIGIN`     | No       | `http://localhost:5173`  | CORS allowed origin               |
| `TELEGRAM_BOT_TOKEN_BOOT` | No | -                        | Optional bootstrap token (can be set from Settings UI) |

The server validates env on boot via Zod and refuses to start with bad config.

---

## App navigation

| Route | Purpose |
| ----- | ------- |
| `/` | **Command Center** — daily HUD: mission status, urgency, briefing, next actions, streak heatmap |
| `/overview` | 30–60 second high-level recap |
| `/tasks`, `/goals`, `/study` | Work views (switch via the Work tab bar) |
| `/mission-map` | Prerequisite tech-tree — locked tasks unlock when upstream tasks complete |
| `/inbox` | Brain-dump capture; Navigator classifies into structured items |
| `/areas` | Life domains and tracks |
| `/logs` | Time, spend, and activity logs |
| `/search` | Full-text search + Navigator summaries |
| `/resources` | Saved links and reference material |
| `/settings` | AI provider, Telegram, sidebar feed, integrations, **Start here** guide |

The sidebar also shows a rotating **quote ticker** (customizable in Settings) and a **Mission XP** badge driven by total task completions.

---

## Mission-control HUD (urgency, streaks, gamification)

### Urgency Engine (`GET /api/urgency`)

Auto-derived pressure metrics — **no manual targets**. Each metric compares **this week** against a **rolling 4-week weekly average** (excluding the current incomplete week):

| Metric | Source |
| ------ | ------ |
| Tasks completed | `Task.completedAt` count |
| Study minutes | `Log` entries with `kind='study'` |
| Spend | `Log.costAmount` (inverted — over baseline = bad) |
| Goal-linked progress | Tasks linked to active goals |

Status thresholds: **ahead** (+20%), **on_track**, **behind** (−20%), **critical** (−50%). Spend uses inverse logic.

The **Mission Status** strip on Command Center summarizes the worst metric in one line.

### Streak heatmap (`GET /api/streak?areaId=`)

GitHub-style **7×12 grid** (84 days) of completion intensity, plus:

- `currentStreak` / `longestStreak`
- `totalCompletions` (powers the sidebar XP badge)

Optional `areaId` filter. Milestone streaks at **3, 7, 14, 30, 60, 100** days trigger a bigger celebration.

### Tiered celebrations

Mutations fire HUD feedback via `celebrate()`:

| Tier | Trigger |
| ---- | ------- |
| `create` | New task, goal, or problem |
| `update` | Status moves forward or progress increases |
| `complete` | Task completion (confetti + neon ring) |
| `streak` | Streak milestone hit after complete |
| `goal` | Goal completion (full-screen burst) |

All tiers honor **`prefers-reduced-motion`** (toast + color flash instead of confetti).

---

## Mission Map (task dependencies)

Prerequisite chains for an Iron Man-style tech tree:

- **`TaskDependency`** model links a task to tasks it depends on
- **Cycle prevention** on the server before insert
- **`GET /api/tasks/mission-map`** — nodes (locked/unlocked) + edges for the graph UI
- **Dependency CRUD** on `/api/tasks/:id/dependencies`
- **Soft-warn on complete** — completing a task with open prerequisites still works; the API returns `warnings[]`

Open **Work → Mission Map** to see locked nodes dimmed with a lock icon; completing prerequisites plays an unlock reveal animation.

---

## Navigator AI

The OpenAI key is **never** exposed to the browser. Every AI call goes through
`/api/ai/*` on the server, which loads relevant DB context, calls the configured
provider (OpenAI or Ollama) with a JSON schema, validates the response with Zod,
and returns typed JSON to the UI.

Primary entry points:

- **Top command bar** — quick capture from any page
- **Inbox** — longer brain dumps
- **Goals** — AI breakdown into milestones
- **Problems** — AI interpretation and solve plans
- **Search** — Navigator summary over search results

---

## Architecture

```
┌────────────────────┐     REST /api      ┌────────────────────┐
│ React Dashboard    │ ─────────────────► │ Express + Zod       │
│  (TanStack Query)  │ ◄───────────────── │ (Prisma client)     │
└────────────────────┘                    └─────────┬──────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │ Navigator AI       │
                                          │ (OpenAI / Ollama)  │
                                          └─────────┬──────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │ SQLite + FTS5      │
                                          └────────────────────┘
```

---

## Features

### Core workflow

- **Command Center** dashboard with mission briefing, next actions, active goals, tracks, problems, budget/study snapshot
- **Areas & tracks** for organizing life domains
- **Tasks** with filters, drag reorder, recurrence, and completion logging
- **Goals** with progress and AI breakdown
- **Study topics** tracking
- **Problems** with AI solve plans
- **Logs** for time, spend, and notes
- **Inbox** for unstructured capture + Navigator classification
- **Search** with FTS5 + Navigator summaries

### Mission HUD & gamification

- Urgency Engine with auto baselines and sparkline trends
- Streak heatmap (84-day grid)
- Mission Status strip and Mission XP badge
- Tiered celebration effects (reduced-motion safe)

### Mission Map

- Task prerequisite graph with locked/unlocked nodes
- Soft-warn when completing tasks with open prerequisites

### Integrations & polish

- **Overview** tab for a quick recap
- **Recurring tasks** (daily / weekly / monthly / interval)
- **Smart reminders** with in-app queue + optional Telegram delivery
- **Telegram inbox capture** — send plain-text messages to your bot; AI classifies them as tasks or expenses (works while the server is offline — messages queue on Telegram and are processed on startup)
- **Full database backup & restore** — one JSON file export/import from Settings
- **Resource manager** (`/resources`)
- **Switchable AI provider** in Settings (OpenAI or local Ollama)
- **Sidebar feed ticker** — tree-structured quote folders (General, Movies, Naruto, ADHD, etc.), exclude items from rotation, customize in Settings
- **Light / dark theme** toggle (sidebar → More)

### Settings sections

- **Start here** — short bullet guide for daily use
- AI provider (OpenAI / Ollama)
- Telegram pairing, quiet hours, and free-text capture
- **Backup & restore** — export/import full database as JSON
- API import, integrations, tracked tags
- Sidebar feed editor

### Still out of scope

- Charts and weekly review UI
- Manual urgency target overrides in Settings
- Audio cues for celebrations (hook reserved in `celebrate.ts`)

---

## Backup & restore

Export your entire local database to a single JSON file, or restore from a previous backup.

### What is included

Areas, tracks, goals, tasks, task dependencies, recurrences, problems, logs, study topics, resources, reminders, tracked tags, pending captures, sidebar feed, app settings, Telegram pairing state, and Telegram inbox dedup records.

**Excluded (by design):** Google OAuth tokens (`IntegrationToken`) and ephemeral AI chat threads.

### How to use

1. Open **Settings → Backup & restore**
2. **Export:** click **Download backup** — saves `command-center-backup-<date>.json`
3. **Import:** choose a backup file — records are **upserted** by ID (same ID updates in place; new IDs are inserted)

### API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/backup/export` | Download full backup JSON |
| `POST` | `/api/backup/import` | Restore from backup payload |

Import uses dependency order (areas → tracks → goals → …) so foreign keys resolve correctly. Partial failures are reported per record in the response `errors[]` array.

---

## Telegram inbox capture

When Telegram is enabled and your device is paired, you can send **plain-text messages** to the bot — not just slash commands.

### What happens

1. You send a message like `buy groceries` or `spent 20$ on lunch`
2. The worker classifies it with AI: **task**, **expense**, or **unknown**
3. **Task** → creates a simple task (`priority: medium`, `source: ai`)
4. **Expense** → creates a `Log` with `kind: expense`
5. The bot replies with a confirmation (e.g. `Task added: Buy groceries`)

If AI is unavailable, a regex fallback treats money-like messages as expenses; everything else becomes a task.

### Offline / server-down behavior

Telegram holds unacknowledged bot updates on their servers. When your Command Center server is off, messages still arrive at Telegram. On startup, the worker replays pending updates.

**Dedup:** Only `messageId`, `chatId`, `sentAt`, and analysis status are stored locally (`TelegramInboxItem`). Message text is **not** stored — Telegram remains the source of truth. Already-analyzed messages are skipped so restarts do not create duplicates.

### Commands still available

| Command | Action |
| ------- | ------ |
| `/start <code>` | Pair device (code from Settings) |
| `/today` | Open and due-today task counts |
| `/next` | Highest-priority next task |
| `/help` | List commands |

Free-text capture requires a **paired** chat. Unpaired senders get pairing instructions.

---

## Key API endpoints (newer)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/api/urgency` | Urgency metrics + mission summary |
| `GET` | `/api/streak?areaId=` | Streak heatmap data + XP total |
| `GET` | `/api/tasks/mission-map` | Dependency graph nodes and edges |
| `GET/POST/DELETE` | `/api/tasks/:id/dependencies` | Prerequisite CRUD |
| `POST` | `/api/tasks/:id/complete` | Returns `{ task, warnings[] }` |
| `GET/POST/PATCH/DELETE` | `/api/sidebar-feed/*` | Quote ticker groups and items |
| `GET` | `/api/backup/export` | Full database backup JSON download |
| `POST` | `/api/backup/import` | Restore database from backup JSON |

---

## Troubleshooting

**`OPENAI_API_KEY` missing on boot** -> Set it in `server/.env`, or switch to Ollama in Settings. The server will refuse to start with invalid config.

**`Cannot find module '@command-center/shared'`** -> Run `npm install` at the repo root (workspaces are linked there).

**Database is empty / schema out of date** -> `npm run db:migrate` or `npm run db:reset` to recreate and reseed. To restore from a saved backup instead, use **Settings → Backup & restore → Choose backup file**.

**Port already in use** -> Change `PORT=4000` in `server/.env` and `VITE_API_BASE_URL` in `client/.env` accordingly.

**Production single-process deploy** -> `npm run build` produces compiled `shared/dist`, `server/dist`, and `client/dist`. `npm run start` then runs the Express server with `NODE_ENV=production`; it serves the React bundle from `client/dist` and falls back to `index.html` for client-side routes, so the whole app is reachable on `http://localhost:4000`.
