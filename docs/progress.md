# Codex Progress / Handoff

## 2026-11-23

The SiteLedger MVP is implemented and verified locally. All 31 tasks in [tasks.md](tasks.md) are complete. The application uses PostgreSQL for persisted workspace and financial data, and private S3-compatible storage for receipts.

### Verification evidence

| Command | Verified result |
|---|---|
| `npm install --no-audit --no-fund` | Dependencies installed and Prisma Client generated. |
| `npx prisma migrate deploy` | Both migrations applied successfully to a new PostgreSQL 16 test database. |
| `npm run db:seed` | Seed completed and a rerun preserved the existing bootstrap account. |
| `npm run lint` | Passed on standalone Node.js 22.23.5. |
| `npm run typecheck` | Passed on standalone Node.js 22.23.5. |
| `npm test` | 5 passed. Verified decimal rounding, pending exposure, transition rules, CSV encoding, and receipt restrictions. |
| `npm run test:integration` | 2 passed, no skips, against real PostgreSQL and a private RustFS bucket. Verified unauthorized reads and writes, invalid approvals/rejections, immutability, budget adjustments, concurrent approvals and allocations, report totals, signed receipt retrieval, and unsigned HTTP 403. |
| `npm run build` | Production build passed on standalone Node.js 22.23.5. |
| `npm run test:e2e` | 1 passed on Chromium against the production build, PostgreSQL, and RustFS. The browser created and edited a project and subcontractor, created an assignment, managed users and memberships, signed in and out, created and edited a multi-line draft, uploaded and downloaded a private receipt, submitted the expense, approved it as the assigned manager, and exported the scoped report. The browser verified PHP 4,000.00 pending exposure and PHP 596,000.00 remaining after approval. |

Earlier browser runs identified ambiguous select and receipt locators and field errors included in the accessible name. The final run used role-based select lookups, an exact receipt download name, and separate labels and error descriptions for expense inputs. The bundled desktop Node binary could not load the native Prisma library on this macOS host. The passing verification used standalone Node.js 22.

### Reproduce or deploy

Follow the [README](../README.md) to reproduce verification against disposable services. The local disposable `ccbm-mvp-pg-isolated` container used port 32768 and the `ccbm-mvp-s3-isolated` container used port 32769. The local run used the private `ccbm-verify` bucket.

The GitHub Actions workflow is configured. This workspace has no Git metadata and the workflow has not run on a hosted runner. No staging or production target, production credentials, or retention policy was supplied. No external deployment has been performed. Once a target is available, follow the [deployment guide](deployment.md) and run the release smoke tests.

### Local sample workspace verification

- Created isolated loopback-only PostgreSQL and RustFS services. The demo uses database `ccbm_demo` on port 32778 and private bucket `ccbm-demo` on port 32779. The workflow tests used `ccbm_test` and `ccbm-test`. Local runtime configuration and generated passwords are stored in the ignored `.env`.
- Applied both Prisma migrations to both databases. The standard seed succeeded in both databases. The demo seed succeeded twice in the demo database, and all three original credentials still signed in after the second run.
- On Node 22.23.5, `npm run lint`, `npm run typecheck`, and `npm run build` passed. `npm test` passed 5 tests. `npm run test:integration` passed 2 tests, including the private RustFS receipt subtest.
- Chromium passed the seeded login test for all three roles and passed the full project, receipt, approval, and CSV workflow in separate runs. The first workflow attempt lost the PostgreSQL connection when Colima stopped. Both browser runs passed after starting Colima and running the tests in the same session.
- Started the production build locally on port 3000. If the local processes stop, start Colima and run `npm run start -- --hostname 127.0.0.1 --port 3000` with Node.js 22 from the workspace.

### Workspace design refresh

Rebuilt the local preview on port 3000. Lint, TypeScript, all 5 unit tests, and the production build passed. Chromium verified demo admin sign-in, dashboard and chart at desktop and mobile widths, the existing assignment and its edit form, the active Projects navigation, and dark mode after reload. The first browser run after the final server restart hit an offline local PostgreSQL instance. The browser check passed after restarting Colima.

### Demo login recovery

Colima had stopped while the local app was still serving the login screen. Started Colima in the foreground through the current macOS user session's `local.siteledger.colima` launchd job so it can stay active independently of the Codex command that started it. Chromium verified that the existing administrator, subcontractor, and project manager accounts each reached the dashboard on port 3000. This job was submitted for the current user session.

### Master data (2026-11-24)

Added the third Prisma migration and applied it to both `ccbm_demo` and `ccbm_test`. Standard seed, lint, TypeScript, 5 unit tests, 3 integration tests, and the production build passed. The isolated Chromium workflow passed after creating a shared supplier through Master data, checking it in the expense form, selecting item units, and completing the existing receipt, approval, and CSV workflow. The refreshed local preview showed Master data, supported bag, meter, liter, and piece options, and still displayed the existing demo expense.

### Edit dialogs

Lint, TypeScript, 5 unit tests, 3 integration tests, and the production build passed. The isolated Chromium workflow passed across all six edit dialogs and the receipt, approval, and CSV steps. It verified Escape, focus restoration, saved values, and user list filtering. A local 390×600 Chromium check confirmed the subcontractor dialog fits and returns focus. Earlier browser runs exposed stale rendering after client navigation, so modal saves reload the record or return to the list with its filters.

### Workspace breadcrumbs

Added clickable parent links and record names to the workspace header. Breadcrumb record queries apply the same access scope as the page. Lint, TypeScript, 5 unit tests, production build, and the full Chromium workflow passed. Chromium clicked back from project assignments to the project and checked source links for assignment-created expenses and the approvals queue. The updated production build is running in the local preview.

### Product name

Renamed the product to Trimonia in the browser title, login screen, workspace sidebar, and README. The production build passed and Chromium verified the new name on the local site and signed in with the existing demo administrator.
