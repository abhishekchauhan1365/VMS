import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api/v1';
const checkInDuration = new Trend('check_in_duration', true);

export const options = {
  scenarios: {
    checkin: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
  },
  thresholds: {
    check_in_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const security = JSON.parse(
    http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'security1@vms.local', password: 'Passw0rd!' }),
      { headers: { 'Content-Type': 'application/json' } },
    ).body,
  );
  const host = JSON.parse(
    http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'host1@vms.local', password: 'Passw0rd!' }),
      { headers: { 'Content-Type': 'application/json' } },
    ).body,
  );
  const offices = JSON.parse(
    http.get(`${BASE_URL}/offices`, {
      headers: { Authorization: `Bearer ${security.accessToken}` },
    }).body,
  );
  return {
    securityToken: security.accessToken,
    hostToken: host.accessToken,
    hostId: host.user.id,
    officeId: offices.offices[0].id,
  };
}

/**
 * Exercises the full check-in hot path each iteration: walk-in create -> host approve
 * (issues the QR pass) -> security check-in (the atomic conditional UPDATE under test).
 * Only the check-in call itself is recorded against the p95 threshold — the other two
 * requests exist purely to produce a fresh APPROVED visit to check in.
 */
export default function (data) {
  const securityHeaders = {
    Authorization: `Bearer ${data.securityToken}`,
    'Content-Type': 'application/json',
  };
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const walkIn = http.post(
    `${BASE_URL}/visits/walk-in`,
    JSON.stringify({
      visitor: {
        fullName: `Load Test ${__VU}-${__ITER}`,
        // schema caps phone at 20 chars — keep only the low digits of Date.now() for uniqueness.
        phone: `+1${String(Date.now()).slice(-10)}${__VU}`,
      },
      hostId: data.hostId,
      officeId: data.officeId,
      visitType: 'BUSINESS_GUEST',
      windowStart: now.toISOString(),
      windowEnd: windowEnd.toISOString(),
    }),
    { headers: securityHeaders },
  );
  if (walkIn.status !== 201) return;
  const visitId = JSON.parse(walkIn.body).visit.id;

  const approve = http.post(`${BASE_URL}/visits/${visitId}/approve`, null, {
    headers: { Authorization: `Bearer ${data.hostToken}` },
  });
  if (approve.status !== 200) return;

  const checkIn = http.post(`${BASE_URL}/visits/${visitId}/check-in`, null, {
    headers: securityHeaders,
  });
  checkInDuration.add(checkIn.timings.duration);
  check(checkIn, { 'check-in succeeded': (r) => r.status === 200 });

  sleep(0.2);
}
