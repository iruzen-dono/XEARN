# Production Operations

This runbook covers the production hygiene that is now available in the repo: database backups, health monitoring, and environment contract validation.

## Production Environment Contract

Use the env contract check to confirm that the required production variables are documented in `.env.example` and present in your runtime environment:

```bash
npm run check:prod-env:example
```

For an actual deployment environment, run:

```bash
npm run check:prod-env
```

The check covers the core auth/database/SMTP secrets, the production ops variables used by the backup and health probes, and the FedaPay secrets when `PAYMENT_MODE=fedapay`.

## Database Backups

Use the backup script to generate a PostgreSQL custom-format dump:

```bash
npm run backup:db
```

The script reads `DATABASE_URL`, strips Prisma's `schema` query parameter, writes a timestamped `.dump` file, and prunes expired archives according to `BACKUP_RETENTION_DAYS`.

Recommended environment variables:

```bash
BACKUP_DIR="./backups/postgres"
BACKUP_RETENTION_DAYS=30
```

Restore example:

```bash
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" backups/postgres/xearn-YYYY-MM-DDTHH-mm-ssZ.dump
```

Recommended scheduling:

- Linux: cron at 02:00 every night.
- Windows: Task Scheduler or a host-provided scheduled job.
- Managed PostgreSQL: keep the script as a local fallback even if the provider also offers snapshots.

## Health Monitoring

Use the health probe to validate the public API health endpoint:

```bash
npm run monitor:health
```

The probe checks `HEALTHCHECK_URL` first, then falls back to `API_URL` or `NEXT_PUBLIC_API_URL` and finally `/api/health`.

Recommended environment variables:

```bash
HEALTHCHECK_URL="https://api.xearn.com/api/health"
HEALTHCHECK_TIMEOUT_MS=5000
ALERT_WEBHOOK_URL=""
```

If `ALERT_WEBHOOK_URL` is set, the script posts a failure payload that works with common incoming webhooks such as Slack, Discord, or a custom alert bridge.

Recommended uptime monitoring:

- UptimeRobot or Better Stack should call `/api/health` every 5 minutes.
- Alert on any non-200 response.
- Keep one human-readable alert route in addition to the synthetic check.

## Operating Notes

- Do not commit dump files. The root `.gitignore` already excludes `backups/`.
- Keep the backup job on a single primary instance if you deploy multiple API replicas.
- If the API is behind a load balancer, health checks should hit the externally exposed URL, not a private container address.
- Use the env contract check as a preflight gate before a release or a manual environment refresh.