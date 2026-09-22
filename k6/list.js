import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api/v1';

export const options = {
  scenarios: {
    list: {
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
    JSON.stringify({ email: 'admin@vms.local', password: 'Passw0rd!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  return { token: res.json('accessToken') };
}

/** Walks a few pages of cursor pagination per iteration to exercise the (officeId, status,
 *  checkInAt) index under realistic front-desk-board usage, not just a single-page GET. */
export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };
  let cursor;

  for (let page = 0; page < 3; page++) {
    const qs = cursor ? `limit=25&cursor=${cursor}` : 'limit=25';
    const res = http.get(`${BASE_URL}/visits?${qs}`, { headers });
    check(res, { 'status is 200': (r) => r.status === 200 });
    cursor = res.json('nextCursor');
    if (!cursor) break;
  }
  sleep(0.3);
}
