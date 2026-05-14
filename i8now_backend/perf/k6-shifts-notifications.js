import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 load test for i8now shifts + notifications.
 *
 * Required env:
 * - BASE_URL            e.g. https://api.example.com
 * - WORKER_TOKEN        Bearer token for a worker user
 * - ADMIN_TOKEN         Bearer token for an admin user
 *
 * Optional env:
 * - WORKER_PUSH_TOKEN   Expo token to register (dummy accepted by schema)
 * - JOB_QUERY           Search query for jobs list
 */

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const WORKER_TOKEN = __ENV.WORKER_TOKEN || '';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';
const WORKER_PUSH_TOKEN =
  __ENV.WORKER_PUSH_TOKEN || `ExponentPushToken[k6_${__VU}_${Date.now()}]`;
const JOB_QUERY = __ENV.JOB_QUERY || '';

const workerHeaders = {
  Authorization: `Bearer ${WORKER_TOKEN}`,
  'Content-Type': 'application/json',
};

const adminHeaders = {
  Authorization: `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json',
};

export const options = {
  scenarios: {
    worker_jobs_browse: {
      executor: 'ramping-vus',
      exec: 'workerJobsBrowse',
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
    worker_apply_flow: {
      executor: 'ramping-vus',
      exec: 'workerApplyFlow',
      stages: [
        { duration: '10s', target: 80 },
        { duration: '30s', target: 80 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
      startTime: '2s',
    },
    admin_notification_send: {
      executor: 'ramping-vus',
      exec: 'adminNotificationSend',
      stages: [
        { duration: '10s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
      startTime: '4s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1200'],
  },
};

function assertRequiredEnv() {
  if (!WORKER_TOKEN) {
    throw new Error('Missing WORKER_TOKEN env var');
  }
  if (!ADMIN_TOKEN) {
    throw new Error('Missing ADMIN_TOKEN env var');
  }
}

function extractJobsList(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const d = payload.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && Array.isArray(d.items)) return d.items;
  return [];
}

export function setup() {
  assertRequiredEnv();
}

export function workerJobsBrowse() {
  const params = new URLSearchParams({
    page: '1',
    limit: '20',
  });
  if (JOB_QUERY) {
    params.set('q', JOB_QUERY);
  }

  const url = `${BASE_URL}/api/v1/student/jobs?${params.toString()}`;
  const res = http.get(url, { headers: workerHeaders });
  check(res, {
    'worker jobs list status 200': (r) => r.status === 200,
  });

  sleep(0.2);
}

export function workerApplyFlow() {
  const listUrl = `${BASE_URL}/api/v1/student/jobs?page=1&limit=10`;
  const listRes = http.get(listUrl, { headers: workerHeaders });
  const ok = check(listRes, {
    'apply flow list status 200': (r) => r.status === 200,
  });
  if (!ok) {
    sleep(0.2);
    return;
  }

  const jobsPayload = listRes.json();
  const jobs = extractJobsList(jobsPayload);
  if (!jobs.length) {
    sleep(0.2);
    return;
  }

  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const shiftId = String(job._id || job.id || '');
  if (!shiftId) {
    sleep(0.2);
    return;
  }

  const registerTokenRes = http.post(
    `${BASE_URL}/api/v1/student/me/push-token`,
    JSON.stringify({ expo_push_token: WORKER_PUSH_TOKEN }),
    { headers: workerHeaders },
  );
  check(registerTokenRes, {
    'push token register status 200': (r) => r.status === 200,
  });

  const applyRes = http.post(
    `${BASE_URL}/api/v1/student/jobs/${encodeURIComponent(shiftId)}/apply`,
    JSON.stringify({ note: 'k6 load test apply' }),
    { headers: workerHeaders },
  );
  check(applyRes, {
    'apply status expected': (r) => [201, 400, 404].includes(r.status),
  });

  sleep(0.3);
}

export function adminNotificationSend() {
  const payload = {
    title: `k6 notification ${__VU}-${__ITER}`,
    body: 'Load-test notification for jobs/shifts flow',
    channel: 'in-app',
    audience_type: 'workers',
  };

  const res = http.post(
    `${BASE_URL}/api/v1/admin/notifications/send`,
    JSON.stringify(payload),
    { headers: adminHeaders },
  );

  check(res, {
    'admin notification queued 202': (r) => r.status === 202,
  });

  sleep(0.4);
}
