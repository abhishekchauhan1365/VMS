You are building a production-quality **Visitor Management System (VMS)** as a take-home assignment. It will be judged on: functionality, UX, error handling, performance, scalability, time/space complexity analysis, code quality, and documentation. Read `ARCHITECTURE.md` in the repo root first and follow it exactly. It is the source of truth for the stack, data model, state machine, and flows.

## Ground rules
- TypeScript everywhere with strict mode. No `any`.
- pnpm workspaces monorepo: `apps/api`, `apps/web`, `packages/shared`.
- Layered backend: routes → controllers → services → repositories. Business logic lives only in services.
- Shared Zod schemas and enums in `packages/shared`, used by both API and web.
- Meaningful names and small functions. Add JSDoc on every service method and on anything non-obvious (state machine, QR signing, rate limiting, cursor pagination), including its time complexity.
- Use mock data and mock providers wherever a real external API would be needed (email via Mailpit, SMS via a console logger, in-app via Socket.IO).
- Work in the phases below. After each phase: run lint, typecheck, and tests, fix everything, commit with a clear message, then give me a 3-line summary before moving on.

## Phase 1 — Scaffold and infra
- Monorepo, ESLint + Prettier, tsconfig base, Husky pre-commit.
- `docker-compose.yml`: postgres:16, redis:7, minio, mailpit, api, web. `pnpm dev` runs everything; `docker compose up` runs the full demo.
- `.env.example` with every variable documented.

## Phase 2 — Data layer
- Prisma schema exactly as in ARCHITECTURE.md §4, with all indexes from §4 (add the `pg_trgm` extension and GIN index via a raw SQL migration).
- Seed script: 3 offices (Mumbai Goregaon, Bengaluru, Delhi), 6 departments, 1 admin, 3 security, 25 hosts, **2,000 visitors and 5,000 visits** spread over 60 days across every status and visit type, so performance and analytics look real. Logins for each role go in the README.

## Phase 3 — API core
- Auth: login, refresh (httpOnly cookie), logout, `requireAuth`, `requireRole`.
- Central error middleware with stable error codes (§9), pino logging with request IDs, helmet, CORS, rate limiting on public and kiosk routes.
- `visitStateMachine.ts`: an explicit transition table and a `transition()` function. Every status change goes through it inside a Prisma transaction, uses an optimistic `version` check, and writes an AuditLog row.
- Endpoints (`/api/v1`):
  - `POST /visitors/search?q=` — trigram search on name, exact on phone/email, max 10 results
  - `POST /visits/walk-in` — multipart with photo → MinIO → PENDING_APPROVAL → notify host
  - `POST /visits/:id/approve`, `/reject` (with reason), `/cancel`
  - `POST /invites` — pre-approval with multiple guests, time window, note; enforces the Redis O(1) per-host daily limit from Policy; creates APPROVED visits + passes; emails QR e-passes; schedules a BullMQ expiry job at windowEnd
  - `POST /passes/verify` — HMAC-signed JWT QR, single use, inside the window, atomic conditional update to CHECKED_IN
  - `POST /visits/:id/check-in`, `/check-out` — idempotent (accept an `Idempotency-Key` header)
  - `GET /visits` — cursor pagination, filters: office, date range, status, type, host, search
  - `GET /visits/:id` — full detail with timeline from AuditLog
  - `GET /hosts/me/pending`, `GET /hosts/me/history`
  - Admin: `GET/PUT /policies`, watchlist CRUD, `GET /analytics` (visits per day, peak hours, by type, avg approval time, overstays), `GET /audit`
  - `GET /passes/:token/public` — visitor e-pass page data (no auth)
- Watchlist check on walk-in and invite → `WATCHLISTED` error plus a security alert.

## Phase 4 — Jobs and real-time
- BullMQ worker: `expire-visit` (delayed to windowEnd), `expire-pending` (N minutes with no host response), `overstay-check` (delayed after check-in), `send-notification`.
- Socket.IO with the Redis adapter; rooms `user:{id}` and `office:{id}`. Emit `visit.created`, `visit.updated`, `visit.overstay`, `visit.rejected`.
- Notification provider interface with Email (Mailpit), SMS (console), and InApp implementations.

## Phase 5 — Frontend
React + Vite + Tailwind + shadcn/ui + TanStack Query + React Router + React Hook Form + Zod. Clean, modern, corporate look (navy primary, like the reference screenshots). Fully responsive. Every mutation shows a toast; every list has skeletons and empty states; destructive actions need a confirm dialog.

Screens:
1. **Login** with role-aware redirect.
2. **Host → Invite Visitors** (match the reference): Event Title*, Type of Visit* dropdown, Office* dropdown, date picker, start–end time, optional personal note; right panel with debounced guest search by name/id/email/phone, an "Added Guests" list with initials avatars and remove buttons, an inline "add new guest" option, and a sticky "Confirm Invite" button disabled until valid. Show remaining daily pre-approval quota.
3. **Host → Approvals inbox**: real-time incoming requests with visitor photo, purpose, and company; one-click Approve/Reject (reject asks for a reason); a badge count in the navbar; browser notification.
4. **Host → My visits** history.
5. **Front Desk → Visitors board** (match the reference): "All (count)", search, date and time-range filters, refresh, table (Visitor + Host, Type of Invite, Entry Time, Exit Time, Status badge with colors for OVERSTAY, CHECKED_IN, CHECKED_OUT, EXPIRED, and so on), infinite scroll with cursor pagination, and live updates via socket. Clicking a row opens a right **Guest Details** drawer: visitor ↔ host avatars, check-in/check-out timeline, visit window, other details, additional-info textarea (0/1000 counter), and a Check-Out button.
6. **Front Desk → Walk-in registration**: form plus **webcam photo capture** (getUserMedia with retake; file upload fallback), existing-visitor autofill by phone, host search. After submit, show a "Waiting for host approval" live status card.
7. **Kiosk → QR check-in**: full-screen `html5-qrcode` scanner with large, clear success/failure states (expired, already used, not yet valid, rejected).
8. **Visitor e-pass page** (`/pass/:token`): QR code, visit details, window, office, host, and a printable badge view with photo.
9. **Admin**: policies form, watchlist, analytics dashboard (Recharts: visits per day, peak hours heatmap, by type, avg approval time, overstay count), and an audit log table with filters.

## Phase 6 — Quality
- API tests (Vitest + Supertest): state machine (every valid and invalid transition), pre-approval limit, QR single-use and expiry, concurrent double check-in (only one succeeds), RBAC denial, validation errors. Aim for ≥80% coverage on services.
- Playwright E2E: invite → e-pass → QR check-in → check-out; walk-in → host approves live → board updates.
- `k6/` load script for search, list, and check-in; record p95 latency in the README.
- `EXPLAIN ANALYZE` for the 3 hottest queries, pasted into `docs/performance.md`.

## Phase 7 — Docs and demo
- README: overview, feature list mapped to the assignment requirements, architecture diagram (Mermaid), tech choices with reasons, setup in under 3 commands, demo credentials, API reference table, **time and space complexity table** per operation, scalability notes (stateless API, Redis adapter, workers, S3, read replicas), error code table, test and load results, screenshots section.
- `docs/demo-script.md`: a step-by-step 3-minute walkthrough for recording the demo video.
- Use Playwright to capture screenshots of every screen into `docs/screenshots/` and embed them in the README.

Start with Phase 1 now. Ask me only if something in ARCHITECTURE.md is truly contradictory; otherwise make the sensible call and note it in `docs/decisions.md`.
