import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api/v1';

// A handful of common name fragments from the seeded 2,000 visitors — realistic fuzzy-search
// terms rather than one repeated string (which the query planner/cache would favor unfairly).
const TERMS = ['an', 'jo', 'sm', 'ma', 'li', 'ka', 're', 'da'];

export const options = {
  scenarios: {
    search: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'security1@vms.local', password: 'Passw0rd!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  return { token: res.json('accessToken') };
}

export default function (data) {
  const term = TERMS[Math.floor(Math.random() * TERMS.length)];
  const res = http.post(`${BASE_URL}/visitors/search?q=${term}`, null, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(0.3);
}
