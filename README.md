# Trimonia

Trimonia tracks construction project budgets, subcontractor allocations, expenses, receipts, and approvals in PHP. Administrators manage access and allocations. Project managers review expenses for their assigned projects. Subcontractors submit expenses and monitor their company's assignments.

## Run locally

You need Node.js 20.19 or later, PostgreSQL, and a private S3-compatible bucket for receipts. Node.js 22 is used in CI.

1. Copy `.env.example` to `.env`. Set `DATABASE_URL`, a random `AUTH_SECRET`, `AUTH_URL`, bootstrap administrator credentials, and the S3 settings. Create the bucket in your storage provider before testing uploads.
2. Run the following commands.

   ```sh
   npm ci
   npx prisma migrate deploy
   npm run db:seed
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) and sign in with the bootstrap credentials. Create a project, subcontractor, and assignment, then use **Users** to grant project or company access.

The seed always ensures the standard expense categories exist. It creates the bootstrap administrator only when both bootstrap variables are supplied, and repeated runs preserve the existing account. Remove the bootstrap password from the environment after provisioning.

## Sample workspace

For a dedicated local demo database, add the following settings to your `.env` and choose a different password for each account. Passwords must be at least 12 characters and at most 72 UTF-8 bytes.

| Demo role | Email | Password setting |
|---|---|---|
| Administrator | `admin@siteledger.test` | `DEMO_ADMIN_PASSWORD` |
| Project manager | `manager@siteledger.test` | `DEMO_MANAGER_PASSWORD` |
| Subcontractor | `subcontractor@siteledger.test` | `DEMO_SUBCONTRACTOR_PASSWORD` |

Set `CCBM_DEMO_SEED=1`, then run:

```sh
npx prisma migrate deploy
npm run db:seed
npm run db:seed:demo
```

Open [the local sign-in page](http://127.0.0.1:3000/login) after starting the app on port 3000. Project `DEMO-001` has a ₱1,000,000 project budget, a ₱600,000 electrical assignment, and a ₱4,000 expense awaiting review. A rerun preserves the sample workspace and existing passwords. Use the **Users** page to change an existing account password.

`npm run test:e2e -- --grep 'seeded demo'` checks sign-in for all three roles when the demo settings and database URL are exported into the test shell.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Set `DATABASE_URL` and the S3 variables in your shell for a **disposable** database and bucket. Apply migrations and seed that database before running integration tests. The suites create unique fixtures and retain them for inspection. The S3 assertions run when `S3_BUCKET` is set.

```sh
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

The browser suite starts the production build on port 3187 and needs `AUTH_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD`. Set them in the shell with the database and storage configuration used for that build.

See [project documentation](docs/README.md), [deployment instructions](docs/deployment.md), and [verification evidence](docs/progress.md).
