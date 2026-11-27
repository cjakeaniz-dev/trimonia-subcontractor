# MVP Task Tracker

Mark each task `[x]` only after implementation and verification. Record blockers and evidence in `progress.md`.

## Phase 1 — Foundation
- [x] Initialize Next.js TypeScript strict project and dependencies
- [x] Configure Tailwind/shadcn, layout, sidebar, light/dark mode
- [x] Configure PostgreSQL, Prisma schema, migrations and seed
- [x] Implement Auth.js login/logout, password hashing, secure sessions
- [x] Implement server-side RBAC and project/company scoping
- [x] Set up lint, typecheck, tests, environment template

## Phase 2 — Projects/Subcontractors
- [x] Project create/list/detail/edit with validation
- [x] Subcontractor create/list/detail/edit
- [x] Admin user and membership assignments
- [x] Assignment create/list/detail with budget allocation
- [x] Project allocation ceiling validation

## Phase 3 — Expenses
- [x] Expense categories and seed values
- [x] Multi-line item expense draft/create/edit and decimal totals
- [x] Submit expense, enforce status transitions
- [x] Receipt upload, private storage and secure access
- [x] Expense list, search, filters, pagination and details

## Phase 4 — Approvals/Budgets
- [x] Review queue with approve/reject and remarks
- [x] Atomic approval, concurrency handling, overspend prevention
- [x] Budget adjustment flow with audit and invariants
- [x] Remaining budget, pending exposure, utilization and warnings
- [x] Role-scoped dashboard charts and KPIs

## Phase 5 — Reports/Admin
- [x] Project/subcontractor/category/date/status reporting
- [x] CSV export respecting access permissions
- [x] User management UI and membership editing
- [x] Paginated audit log and financial audit events

## Phase 6 — Quality
- [x] Unit tests for monetary calculations and status transitions
- [x] Integration tests for RBAC, budget rules and concurrency
- [x] End-to-end flow: create project → assign → submit → approve → report
- [x] Validate upload restrictions and access isolation
- [x] Lint, typecheck, tests, production build all passing
- [x] Update README and deployment instructions

All checklist items were verified locally. See [progress.md](progress.md) for the test evidence and deployment status.

## Local demo

- [x] Add opt-in demo seed for administrator, assigned manager, and subcontractor accounts with a populated project and pending expense.
- [x] Apply both migrations, run the standard and demo seeds, rerun the demo seed, and verify all three accounts in Chromium against the persisted demo database.

## Workspace design refresh

- [x] Refresh the shared navigation, budget dashboard, assignment details, tables, and forms. Verify desktop, mobile, and dark mode in Chromium.

## Master data

- [x] Add admin-only, audited management of expense units, categories, supplier suggestions, and project location suggestions.
- [x] Migrate existing data, enforce active unit options, preserve saved drafts, and verify on the local preview and isolated workflow test database.

## Edit dialogs

- [x] Move project, subcontractor, assignment, expense draft, user, and master-data edit forms to accessible dialogs and verify the complete workflow in Chromium.

## Breadcrumbs

- [x] Link parent pages and recognized entry points in workspace breadcrumbs. Verify nested navigation and expense entry points in Chromium.

## Product name

- [x] Rename the user-facing product to Trimonia and verify the local login and dashboard.
