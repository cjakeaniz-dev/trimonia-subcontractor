# Deployment Guide

## Environment

Run the Next.js application on a Node.js host with PostgreSQL and a private S3-compatible bucket. Use separate PostgreSQL databases and buckets for development, staging, and production. Set the following through your host's secret manager. See [the environment template](../.env.example).

| Setting | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Enable TLS for managed databases according to provider instructions. |
| `AUTH_SECRET` | Random Auth.js session secret. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Canonical HTTPS origin in production. |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Optional initial account. Password must be at least 12 characters and at most 72 UTF-8 bytes. Remove credentials after bootstrap. |
| `S3_BUCKET`, `S3_REGION` | Private receipt bucket and its region. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Storage access credentials. Omit both when using a supported AWS workload identity. |
| `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` | Custom provider endpoint and addressing mode. The signed URL endpoint must be reachable from user browsers. |

Block public bucket access and grant the application GetObject, PutObject and DeleteObject for the `receipts/` prefix. Delete permission allows cleanup when a database write fails. Keep the bucket on an origin separate from the application to isolate browser previews. The app signs receipt links for 60 seconds and permits up to 10 JPG, PNG, or PDF attachments of 5 MB each per draft. Configure the hosting ingress to allow the 7 MB server action request limit.

## Release

1. Install with `npm ci` and build with `npm run build`. Verify on a staging database and bucket with the integration and browser suites.
2. Take a PostgreSQL backup, verify provider recovery settings, and apply migrations with `npx prisma migrate deploy` using a schema migration account. Give the runtime account only the data permissions it needs.
3. Run `npm run db:seed` to ensure expense categories and provision the intended initial administrator. Omit bootstrap values during later releases unless provisioning an empty environment.
4. Start with `npm run start` and put it behind HTTPS. Preserve the canonical host and HTTPS origin on the reverse proxy. Confirm secure Auth.js cookies in staging.
5. Smoke-test sign-in, role-scoped project access, draft upload and download, approval and remaining budget, and report export. Confirm that an unauthenticated request cannot access a receipt.
6. Configure uptime and application error alerts, database backups and object storage versioning or backups according to the required retention policy. Periodically remove expired `LoginThrottle` rows and investigate receipt cleanup errors. Restrict access to logs and audit history.
7. Keep the previous application release available. Review migration compatibility before rolling back application code. Coordinate PostgreSQL and object recovery to preserve receipt references and financial history. Rehearse recovery in staging.

Local verification uses PostgreSQL and RustFS. A production target, retention policy, and release credentials are pending. No staging or production deployment has been performed.
