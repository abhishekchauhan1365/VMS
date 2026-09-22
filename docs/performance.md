# Performance

Measured against the Phase 2 seed data (3 offices, 2,000 visitors, 5,000 visits over 60 days) on
a single developer machine — absolute numbers will vary by hardware, but the relative story
(index scan vs. seq scan, O(1) vs. O(n) operations) holds.

## Load test results (k6, `k6/`)

Run with the API + worker + full docker-compose infra up, `pnpm --filter=@vms/api run db:seed`
already applied.

```bash
k6 run k6/search.js    # POST /visitors/search?q=
k6 run k6/list.js      # GET /visits (3 pages of cursor pagination per iteration)
k6 run k6/checkin.js   # POST /visits/:id/check-in (full walk-in -> approve -> check-in path)
```

| Script       | Load                            | p95                              | Threshold | Result                                   |
| ------------ | ------------------------------- | -------------------------------- | --------- | ---------------------------------------- |
| `search.js`  | 20 VUs, 30s                     | **20.1 ms**                      | < 500 ms  | ✅ pass, 0% errors, 64 req/s             |
| `list.js`    | 20 VUs, 30s (3 pages/iteration) | **43.4 ms**                      | < 500 ms  | ✅ pass, 0% errors, 155 req/s            |
| `checkin.js` | 10 VUs, 30s                     | **21.6 ms** (check-in call only) | < 300 ms  | ✅ pass, 0% errors, 38 full iterations/s |

`checkin.js`'s reported p95 is on the check-in request specifically (`check_in_duration` custom
Trend metric) — each iteration also does a walk-in create and a host approve first to produce a
fresh `APPROVED` visit, so the overall `http_req_duration` average (~21 ms) includes those too.

## `EXPLAIN ANALYZE` — the three hottest queries

### 1. Front-desk board (`GET /visits?officeId=&status=`)

Backs the live visitors board — the single most-hit authenticated query. Uses the
`(officeId, status, checkInAt)` composite index from §4 directly as an index scan, no sort step:

```
Limit  (cost=0.28..51.40 rows=25 width=106) (actual time=0.108..0.328 rows=25 loops=1)
  ->  Index Scan Backward using "visits_officeId_status_checkInAt_idx" on visits
        (cost=0.28..762.96 rows=373 width=106) (actual time=0.107..0.324 rows=25 loops=1)
        Index Cond: (("officeId" = $1) AND (status = 'CHECKED_IN'))
Planning Time: 1.304 ms
Execution Time: 0.359 ms
```

Sub-millisecond execution even scanning backward for `ORDER BY checkInAt DESC` — the index's
column order makes the sort free.

### 2. Visitor search (`POST /visitors/search?q=`)

Trigram fuzzy match on `fullName` (plus exact `phone`/`email`). At this dataset size (2,000
visitors) Postgres's planner prefers a sequential scan — the table fits in a few pages, so an
index lookup isn't worth the extra I/O:

```
Seq Scan on visitors (cost=0.00..121.67 rows=2 width=136) (actual time=0.038..5.638 rows=1 loops=1)
  Filter: (("fullName" % 'Jerome') OR (phone = 'Jerome') OR (email = 'Jerome'))
Execution Time: 5.819 ms
```

Forcing the planner off seq-scan (`SET enable_seqscan = off`) confirms the GIN trigram index
(`visitors_fullName_trgm_idx`, added in the Phase 2 migration) is correctly picked up and used —
the planner will switch to it automatically once the visitor table is large enough that a full
scan stops being cheaper:

```
Bitmap Heap Scan on visitors (cost=167.02..174.01 rows=2 width=136) (actual time=0.691..0.742 rows=1 loops=1)
  ->  BitmapOr
        ->  Bitmap Index Scan on "visitors_fullName_trgm_idx"
              Index Cond: ("fullName" % 'Jerome')
        ->  Bitmap Index Scan on visitors_phone_key
        ->  Bitmap Index Scan on visitors_email_idx
Execution Time: 1.045 ms
```

### 3. Cursor-paginated visit list (`GET /visits`, no filters)

The `id < cursor` half of Prisma's cursor pagination (`orderBy: [requestedAt desc, id desc]`,
`cursor: { id }`, `skip: 1`) hits the primary key index directly rather than an `OFFSET` scan:

```
Limit (cost=224.42..224.49 rows=26 width=38) (actual time=0.759..0.763 rows=26 loops=1)
  ->  Sort (cost=224.42..229.34 rows=1966 width=38) (actual time=0.758..0.760 rows=26 loops=1)
        Sort Method: top-N heapsort  Memory: 28kB
        ->  Index Scan using visits_pkey on visits (actual time=0.028..0.536 rows=1871 loops=1)
              Index Cond: (id < $1)
Execution Time: 0.823 ms
```

Cost stays flat regardless of how deep into the result set the cursor is — no `OFFSET n` scan of
`n` discarded rows, which is what makes cursor pagination O(log n + page) instead of O(n) per
page as a user pages deeper into the board.

## O(1) operations (not index-backed — Redis)

- **Pre-approval daily quota** (`inviteService.reserveDailyQuota`): a single `INCR` +
  conditional `EXPIRE` on `preapprovals:{hostId}:{date}`, not a `COUNT(*)` over today's invites.
- **Idempotency replay** (`lib/idempotency.ts`): a `GET`/`SET EX 300` on
  `idempotency:{key}`, so a retried check-in/check-out replays the cached response instead of
  re-running the transition.
