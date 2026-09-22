# Decisions log

Notes on sensible calls made when ARCHITECTURE.md or CLAUDE_CODE_PROMPT.md didn't spell out an
implementation detail.

## Phase 1

- **pnpm not preinstalled** — installed globally via `npm install -g pnpm` (corepack wasn't on
  PATH in this environment). Pinned pnpm 9+ compatible workspace config either way.
- **ESLint flat config (`eslint.config.js`)** instead of legacy `.eslintrc` — required for
  ESLint 9, which is current at time of writing.
- **Root `package.json` marked `"type": "module"`** to match the ESM-first TS config
  (`module: NodeNext`) used by `apps/api` and `packages/shared`, avoiding CJS/ESM interop
  warnings from tsx/eslint.
- **`apps/api/src/server.ts` is a minimal health-check server for now** (`GET /api/v1/health`).
  Real routes, Prisma, and middleware land in Phase 3 per the plan.

## Phase 2

- **Pinned `prisma`/`@prisma/client` to `6.19.3`** instead of the `latest` dist-tag, which
  currently resolves to an `8.0.0-rc.*` release candidate with a changed CLI/config surface.
  6.x is the stable, well-documented generation this project targets.
- **Local Postgres port moved to 5435** (`.env`'s `POSTGRES_PORT`) — this dev machine already had
  a native Postgres on 5432 and other Docker projects on 5433/5434. `docker-compose.yml` and
  `DATABASE_URL` both read the port from `.env`, so this is a one-line change per machine, not a
  hardcoded assumption.
- **`prisma.config.ts`** loads env vars from the repo-root `.env` (not `apps/api/.env`) so there
  is a single source of truth; `prisma/seed.ts` and `src/server.ts` do the same via `dotenv` at
  their top so `tsx` (which doesn't auto-load `.env`) sees the same vars as the Prisma CLI.
- **`apps/api/tsconfig.json` typechecks `src` and `prisma` together** (seed script included) but
  **`tsconfig.build.json`** (used by `pnpm build`) restricts `rootDir`/`include` to `src` only —
  the seed script runs via `tsx`, never compiled to `dist`.
- **Audit log entries seeded per decided visit** (decision + check-in + check-out where
  applicable) even though Phase 3 doesn't formally require this until the `transition()` function
  lands — Phase 5's Guest Details drawer needs a timeline to render, so the seed produces one
  now (~8,300 rows for 5,000 visits).
- **Visit status/type distribution is weighted, not uniform** (`STATUS_WEIGHTS` in
  `prisma/seed.ts`), to resemble a real front-desk board (more `CHECKED_OUT`/`EXPIRED` than
  `CANCELLED`, for example) rather than an even split across all 7 statuses.

## Phase 3

- **`transition()` uses `updateMany` with an `UncheckedUpdateManyInput`**, not `update` — a
  conditional `WHERE id = ? AND status = ? AND version = ?` needs `updateMany`, and Prisma's
  "checked" update type for that method excludes foreign-key scalars like `decidedById` (it
  expects a relation `connect`, which `updateMany` can't do). The unchecked variant allows
  setting `decidedById` directly, matching what the conditional update actually needs.
- **`/passes/verify` and `/passes/:token/public` are public + rate-limited, not
  `requireAuth`** — the kiosk and visitor e-pass page have no login per ARCHITECTURE.md §3
  ("Visitor (no login)"), so they're gated by `publicRateLimiter` instead.
- **In-app notifications only in Phase 3** (`notificationService.notify` just writes a
  `Notification` row) — Email (Mailpit) and SMS (console) providers and the Socket.IO push
  land in Phase 4 per the plan; wiring the interface now would mean rewriting it once the queue
  exists.
- **BullMQ job _producers_ (`src/jobs/queue.ts`) were added in Phase 3, not Phase 4** — invite
  creation, walk-in creation, and check-in all need to schedule delayed jobs (expiry, overstay)
  to be functionally complete, so the `Queue` and `scheduleX()` functions exist now. The
  `Worker` that consumes them is Phase 4 (jobs currently queue but nothing processes them yet).
  BullMQ job IDs can't contain `:`, only URL-safe chars — used `expire-visit-<id>` not
  `expire-visit:<id>`.
- **`tsx watch` restricted to `--watch-path ./src`** — by default it also watched
  `node_modules` on this machine (first-touch lazy loads from `minio`/`bullmq` triggered restart
  loops), which no `tsx` flag ignores by pattern; scoping the watch path to `src` was simpler
  than an ignore-list.
- **Express 5's `ParamsDictionary` types every value as `string | string[]`** (to support
  repeated wildcard segments) — added `src/lib/params.ts#requireParam` instead of non-null
  asserting `req.params.id!`, which doesn't fix the underlying type.
- **Verified by hand against the live seeded DB, not yet by an automated test** (Phase 6 adds
  Vitest/Supertest coverage): login, RBAC 401/403, visitor trigram + exact search, walk-in →
  approve → check-in → check-out, a concurrent double check-in (confirmed only one of two
  parallel requests succeeds, the other gets `409 CONFLICT`), invite creation with the Redis
  quota decrementing, QR verify + single-use rejection, watchlist blocking, and admin
  policies/analytics/audit/pagination.

## Phase 4

- **Cross-process real-time push uses `@socket.io/redis-emitter`, not a shared `io` instance** —
  the BullMQ worker runs in its own process (`src/worker.ts`) with no Socket.IO server of its
  own. The Emitter publishes room events over the same Redis pub/sub channels the API server's
  `@socket.io/redis-adapter` already subscribes to, so both the API (request handlers) and the
  worker (job handlers) call the same `notify()` / `broadcastVisitEvent()` helpers regardless of
  which process they run in.
- **`notify()` fans out to three channels and never throws on channel failure** — in-app
  `Notification` row (DB), email (Mailpit SMTP) and SMS (console mock) run in `Promise.all`, but
  only the email provider wraps its own try/catch (logs a warning) since a flaky SMTP connection
  is expected during local dev and must not fail the request/job that triggered the notification.
- **OVERSTAY has no code path that writes `status = 'OVERSTAY'`** — ARCHITECTURE.md §5 calls it
  "a derived flag," so `handleOverstayCheck` only calls `notify()` and pushes a
  `visit.overstay` socket event; the visit's stored status stays `CHECKED_IN`.
- **Verified end-to-end with a throwaway Socket.IO client** (connected with a real JWT, joined
  `user:{hostId}`): a walk-in and an approve both arrived live as `visit.created` /
  `visit.updated`. Also manually enqueued an `expire-pending` job at a 1s delay against a real
  seeded visit and confirmed the worker flipped it to `EXPIRED` and logged "Job completed" —
  the full delayed-job path works, not just the immediate one exercised by curl in Phase 3.

## Phase 5

- **No shadcn/ui CLI run** — `npx shadcn init/add` prompts interactively and needs network access
  to a registry; instead hand-wrote a small Tailwind component set
  (`apps/web/src/components/ui/primitives.tsx`, `Dialog.tsx`) with the same navy palette and a
  similar API shape (`Button`, `Input`, `Select`, `Card`, `Modal`, `Drawer`, `ConfirmDialog`, …).
  Functionally equivalent for this app's needs, without the CLI dependency.
- **Added `GET /offices` and `GET /hosts`** — not in the original endpoint list, but the Invite
  and Walk-in forms need an office dropdown and a host search, and no existing endpoint returns
  either. Both are `requireAuth`-only (any signed-in role), read-only, no new write surface.
- **Peak-hours chart is a bar chart by hour-of-day, not a 2D day×hour heatmap** — the ask was "peak
  hours heatmap"; a true heatmap needs a day axis too, but `GET /admin/analytics` only bucketed by
  hour (`peakHours: [{hour, count}]`). Kept the simpler shape rather than adding a second
  aggregation query this late; documented here rather than silently downgrading the spec.
- **Socket auth is a JWT passed in `handshake.auth.token`, refreshed by the client on
  reconnect** — `getSocket()` re-reads the token from the in-memory store on every call so a
  refreshed access token is picked up without the caller managing reconnect logic itself.
- **No browser automation tool was available in this environment** to click through the running
  UI. Verified instead by: full TypeScript strict-mode typecheck across `apps/web` (catches
  prop-shape mismatches against the real API responses — confirmed several against live `curl`
  output, e.g. `/offices`, `/hosts`, `/admin/analytics`, `/admin/audit`), a clean production
  `vite build`, ESLint, and the dev server serving `index.html` / `main.tsx` correctly. A human
  click-through is still recommended before treating any screen as fully verified.
  **Update (Phase 6):** Playwright's own bundled Chromium (installed via
  `playwright install chromium`) _did_ end up exercising the real UI in a real browser — see
  below. That's a different thing from an interactive MCP browser tool for manual driving, which
  still wasn't available, but the login, invite, walk-in, board, and e-pass screens are now
  confirmed working end-to-end, not just typechecked.

## Phase 6

- **Tests run against the live dev/demo Postgres**, not an isolated test database — this
  environment has one Postgres container, and standing up a second (or a transactional-rollback
  harness) was more setup than the time budget allowed. Every fixture `tests/helpers.ts` creates
  is tagged (`Test Office …` / `@example.test` emails / `+1-…` phones) so
  `tests/globalTeardown.ts` can find and delete exactly that data after the run, never touching
  the real seeded rows. Running the suite is therefore safe against the demo DB, but not
  parallel-safe across two simultaneous `pnpm test` runs.
- **`src/app.ts` split out from `src/server.ts`** — `createApp()` returns the configured Express
  app with no listening socket, so Supertest can hit it directly without binding a port (or
  starting Socket.IO/the HTTP server) per test file.
- **Bumped `vitest` to 5.0.1 in `apps/api` and `packages/shared`** (matching `latest`, not the
  stale `^2.1.4` originally pinned in Phase 1) — needed to satisfy `@vitest/coverage-v8`'s peer
  requirement. **Left `apps/web` on `vitest@2.1.9`**, because `vitest@5` requires
  `vite@^6/7/8` and `apps/web` is on `vite@5.4` (upgrading Vite itself was out of scope for a
  test-tooling change); `apps/web`'s tests don't need the coverage provider anyway.
- **`packages/shared` and `apps/api` each gained a `tsconfig.build.json`** split from the
  typecheck-time `tsconfig.json` — the latter now includes `tests/` (and `prisma/`, `e2e/`,
  `playwright.config.ts` where relevant) for full-repo typechecking, while the build config stays
  scoped to `src` so test files never leak into `dist/`.
- **k6 scripts avoid `URLSearchParams`** — k6's JS runtime (goja) doesn't implement it; build
  query strings by hand instead. Also had to cap the `checkin.js` load-test visitor phone to the
  schema's 20-char limit (`newGuestSchema.phone`) — an earlier version generated a too-long phone
  and every walk-in in the run 400'd instantly, producing a nonsensical 12,000 req/s "success"
  number until traced back to a `VALIDATION_ERROR` on `phone`.
- **`checkin.js` measures the check-in call specifically** (a k6 `Trend` metric), not the whole
  iteration — each iteration also does a walk-in create and a host approve first (to produce a
  fresh `APPROVED` visit to check in), and lumping those into the threshold would measure the
  wrong thing.
- **Playwright E2E tests use separate browser contexts per role**, not sequential `page.goto`
  calls with different logins in the same context — the httpOnly refresh cookie persists across
  navigation, so navigating to `/login` as a second user while the first user's session cookie is
  still valid triggers `AuthContext`'s silent-refresh-on-mount and redirects away from the login
  form before it renders, timing the test out. Separate `browser.newContext()` calls give each
  role its own cookie jar.
- **The invite E2E test uses `host2@vms.local`, not `host1`** — `host1` is the account used
  throughout this session's manual `curl` testing (Phases 3-4) and its daily pre-approval quota
  (5/day) was already exhausted by the time the E2E suite ran. This is a real product constraint
  surfacing in test data hygiene, not a bug: re-running the invite E2E test enough times in one
  day will eventually exhaust `host2`'s quota too.
- **`WalkIn.tsx`'s host search now matches email as well as name** (was name-only) — surfaced by
  writing the E2E test itself: searching "host1" against seed-generated random names (e.g. "Dr.
  Evalyn Anderson") never matched anything, but a front-desk user searching by the part of a name
  or email they remember is exactly the real use case that filter needs to serve.

## Phase 7

- **Database reseeded before final screenshots** — by this point in the session the demo DB had
  accumulated real rows from every manual `curl` test (Phases 3-4), the k6 checkin load test
  (~1,100 extra walk-ins), and the Playwright suites. The first Analytics screenshot showed an
  obviously-wrong single-day spike in "visits per day" because of this. `TRUNCATE` +
  `db:seed` restored the clean 3-office/2,000-visitor/5,000-visit dataset the assignment
  describes before capturing the screenshots that ship in the README.
- **`apps/web` needed its own `vitest.config.ts`** (`include: ['tests/**/*.test.ts']`) — without
  one, `vitest run` picked up `e2e/*.spec.ts` too and failed immediately, since Playwright's
  `test.describe` isn't valid outside the Playwright test runner. `apps/api`'s `vitest.config.ts`
  already scoped `include` to `tests/`, so it never hit this; `apps/web` was missing the same
  guard until this surfaced via `pnpm -r run test`.
- **Removed `docs/screenshots/*.png` from `.gitignore`** — that entry was written in Phase 1
  before any screenshots existed, on the assumption they'd be handled separately. Now that
  Playwright captures real screenshots referenced directly in the README (`docs/screenshots.spec.ts`
  → 13 PNGs, ~1.9 MB total), they need to be committed for the README to render on GitHub/anywhere
  else the repo is viewed without re-running the capture script.
- **The pie chart in Analytics briefly looked broken in a screenshot** (empty "By visit type"
  panel) — it wasn't: Recharts animates pie slices in, and the screenshot script's fixed 400ms
  settle delay fired before the animation finished. Confirmed via DOM inspection (the `<path>`
  elements were there, correctly colored) before concluding it was a timing issue, not a bug;
  fixed by giving that one page a longer wait before capture rather than "fixing" code that
  wasn't broken.
- **API reference, error code, and complexity tables in the README are hand-maintained**, not
  generated from the OpenAPI/Zod schemas — there's no OpenAPI spec in this project (not asked
  for), so these tables should be kept in sync by hand if endpoints change; noted here so a
  future change to `src/routes/` doesn't silently drift from the README.
