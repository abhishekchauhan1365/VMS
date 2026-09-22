# Load tests

Requires `k6` (`brew install k6`) and the API + worker + full `docker-compose` infra running
locally, seeded (`pnpm --filter=@vms/api run db:seed`).

```bash
k6 run k6/search.js    # POST /visitors/search?q=  — trigram + exact search
k6 run k6/list.js      # GET /visits — cursor-paginated front-desk board, 3 pages/iteration
k6 run k6/checkin.js   # POST /visits/:id/check-in — full walk-in -> approve -> check-in path
```

Results (p95 latency) are recorded in [`docs/performance.md`](../docs/performance.md).
