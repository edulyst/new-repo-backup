# k6 Shifts + Notifications Load Test

## Prerequisites

- k6 installed locally.
- A running backend URL.
- One valid worker JWT and one valid admin JWT.

## Run

```bash
k6 run perf/k6-shifts-notifications.js \
  -e BASE_URL=https://your-api.example.com \
  -e WORKER_TOKEN=eyJ...worker... \
  -e ADMIN_TOKEN=eyJ...admin...
```

Optional:

- `-e WORKER_PUSH_TOKEN=ExponentPushToken[...]`
- `-e JOB_QUERY=retail`

## What it tests

- Worker load on `GET /api/v1/student/jobs`
- Worker load on `POST /api/v1/student/jobs/:id/apply`
- Worker push token registration on `POST /api/v1/student/me/push-token`
- Admin notification queue load on `POST /api/v1/admin/notifications/send`

## Notes

- Apply endpoint accepts `201` (applied), and also `400/404` in load runs where duplicate/closed shifts are expected.
- Use staging data; do not run this against production without safeguards.
