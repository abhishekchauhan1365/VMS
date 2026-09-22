# Demo script (~3 minutes)

Setup before recording: `docker compose up` (or `pnpm dev` with infra up), DB seeded, two browser
windows side by side — one for the **Host**, one for **Security**. Have `admin@vms.local` /
`Passw0rd!` ready for the last beat.

## 1. Pre-approval → QR e-pass (45s)

1. Log in as `host1@vms.local`. Land on **Invite Visitors**.
2. Fill Event Title, pick a Type and Office, today's date, a time window.
3. Search "guests" for a name a couple of characters — point out the debounced fuzzy search
   hitting the trigram index. Add one existing guest via the dropdown.
4. Add a brand-new guest inline (name + phone) — note the "Remaining pre-approvals today" counter
   ticking down.
5. Click **Confirm Invite** — toast confirms, a QR e-pass was just generated and "emailed"
   (open Mailpit at `localhost:8025` if you want to show the real email).
6. Open the visitor e-pass page (`/pass/:token`) in a new tab — show the QR code, status badge,
   and the printable badge layout.

## 2. Walk-in → live host approval (60s)

1. Switch to the **Security** window, logged in as `security1@vms.local`, on the **Visitors
   Board** — point out the live table, status badges, and cursor-paginated infinite scroll.
2. Go to **Walk-in**. Type a phone number that matches an existing seeded visitor — show the
   auto-fill kick in.
3. Clear it, register a new visitor instead: name, phone, office, host search (type part of a
   host's name or email). Use the webcam ("Use webcam" → capture → retake once to show that
   works) or the file-upload fallback.
4. Submit — the screen flips to "Waiting for host approval" with a live status badge.
5. Switch to the **Host** window → **Approvals Inbox** — the new request appears _without a
   refresh_ (Socket.IO push). Approve it.
6. Switch back to Security — the waiting screen updates to **APPROVED** live, no polling.

## 3. Kiosk check-in and the board updating live (30s)

1. Open `/kiosk` in a third tab (or reuse one) — full-screen QR scanner.
2. Since a real camera scan is hard to demo cleanly, either point a phone showing the QR from the
   e-pass tab at the camera, or (faster for a recording) show the same flow via the front-desk
   board: click the visitor's row → **Guest Details** drawer → point out the timeline (created →
   approved → checked in) and the **Check Out** button. Click it.
3. Back on the board, the row's status updates live to `CHECKED_OUT` with no refresh.

## 4. Admin: analytics, watchlist, audit (45s)

1. Log in as `admin@vms.local` → **Analytics** — visits-per-day, peak check-in hours, by-type
   breakdown, overstay count, avg approval time. All real data from the seed.
2. **Watchlist** — add a phone number, then show that a walk-in for that phone is rejected with a
   clear `WATCHLISTED` error (open dev tools network tab briefly, or just narrate it).
3. **Audit Log** — scroll to show the append-only trail of every status change captured during
   this demo (the invite, the walk-in approval, the check-out), each with actor/before/after/
   timestamp.
4. **Policies** — show the three tunables (daily quota, overstay threshold, pending timeout) are
   live-editable, not hardcoded.

## Closing beat (optional, 10s)

Mention what's under the hood but not visible on screen: the state machine enforces every
transition through one choke point with optimistic concurrency (a double check-in race can only
ever succeed once), BullMQ auto-expires stale invites and flags overstays without cron table
scans, and the whole thing is covered by 91 backend tests, 2 E2E flows, and load-tested under
20 concurrent users at ~20ms p95.
