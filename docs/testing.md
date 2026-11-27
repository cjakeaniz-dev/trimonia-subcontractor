# Test Plan

## Critical scenarios
1. Admin creates PHP 1M project, assigns PHP 600k to subcontractor.
2. Attempt allocation exceeding project budget is rejected.
3. Subcontractor creates expense with screws 10 kg × 250 and cement 5 bags × 300; total equals PHP 4,000.
4. Pending expense does not reduce approved spent; pending exposure displays PHP 4,000.
5. Authorized manager approves; remaining equals PHP 596,000.
6. Rejection requires reason and leaves approved spent unchanged.
7. Attempt to approve expense larger than remaining is rejected.
8. Concurrent approvals cannot overspend assignment.
9. Repeated approval cannot double-count expense.
10. Subcontractor cannot see another subcontractor's expenses or download receipts.
11. Manager cannot access unassigned projects, including through exports/API.
12. Approved expense cannot be silently edited or deleted.
13. Budget decrease below approved spent is rejected.
14. Reports reconcile with assignment dashboard totals.
15. Malicious/oversized uploads are rejected; private files are inaccessible without authorization.

Run unit tests, integration tests and a minimal end-to-end suite. Record exact commands and results in progress.md; do not claim success without running them.

## Run the suites

- `npm test` covers the money rules, status transitions, CSV encoding, and upload validation.
- `npm run test:integration` uses the disposable database identified by the exported `DATABASE_URL`. Apply migrations and seed first. Export the S3 settings to also verify real receipt storage and authorization.
- `npm run build` followed by `npm run test:e2e` exercises the production server with Chromium. Use the disposable database, bucket, and bootstrap credentials. See [local setup](../README.md).
- The GitHub Actions workflow defines the same checks using disposable PostgreSQL and RustFS services.
- After populating a dedicated demo database, export the demo settings and run `npm run test:e2e -- --grep 'seeded demo'` to verify login, role-specific navigation, and sample records for each seeded account.
