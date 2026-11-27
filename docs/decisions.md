# Decisions and Open Questions

## Defaults
- MVP is expense budget monitoring, not physical cash tracking.
- Single contractor organization, PHP, Asia/Manila display timezone.
- Subcontractors can submit but cannot approve expenses.
- Pending expenses are not reserved against budget.
- CSV is required; XLSX is optional if trivial to support.
- Receipt storage uses private S3-compatible bucket.

## Confirm with client
1. Does PHP 600,000 mean a spending ceiling or actual cash advanced? If cash, revisit scope.
2. Are subcontractor labor charges and services included alongside materials? Default: yes.
3. Is project budget strictly an allocation ceiling? Default: yes.
4. Who can approve and adjust budgets? Default: admin approves/adjusts; assigned manager approves.
5. Are multiple assignments per subcontractor/project required? Default: one assignment per scope, with explicit unique identity.
6. Required file retention, storage provider and hosting target.

## Implementation decisions

- Projects and assignments use Active/Archived states. Companies and users have an active flag. Financial records and their relationships are retained. An archived assignment releases its allocation from the project ceiling, and reactivation rechecks the ceiling. Reports can include historical assignments. Dashboard financial cards summarize active assignments, and pending queues also show historical assignments that still need a rejection decision.
- Assignments have stable UUIDs and a scope label. Multiple assignments per project and company are supported. Existing assignments retain their original project, company, and starting budget. Administrators change allocations using signed adjustments with a required reason.
- Approved expenses are immutable. For an operational correction, an administrator can record a compensating budget adjustment referencing the expense and the reason. The historical approved spend remains visible. The adjustment changes available budget and must satisfy the project ceiling and spent floor.
- Subcontractor company members can see their company's submitted records and shared assignment balances. Drafts are visible to their author and administrators. Managers can submit and review expenses within projects they are assigned.
- Receipts are attached after draft creation and before submission. Uploads use file size and content signature checks and an allowlist of declared MIME types. Downloads and browser previews use short-lived signed URLs. The application permits drafts without receipts.
- Auth.js uses credential-based sign-in, bcrypt, and eight-hour JWT sessions. The application checks the current user and session version on protected requests. Updating an account invalidates its existing sessions. The PostgreSQL login throttle allows up to ten attempts per normalized email within its current 15-minute window. Use ingress rate limiting for broader traffic controls.
- Dates supplied as calendar dates are stored as PostgreSQL dates. Event timestamps use Asia/Manila for display. CSV includes scoped expense records and preserves two decimal places for PHP totals.

- The optional local demo seed creates a single sample workspace and three role-scoped accounts in one transaction. It uses operator-supplied passwords and runs separately from the standard category and bootstrap seed. Local workflow tests use a different database and receipt bucket to keep the demo workspace ready for review.

- Use the shared workspace layout and theme across roles so navigation, forms, tables, and status indicators stay consistent. Use a prominent header and metric icons on the dashboard and assignment detail, where users monitor budget balances.

- Administrators maintain expense units, expense categories, shared supplier suggestions, and project location suggestions in Master data. New expense lines require active units. Saved drafts can retain their existing inactive unit quantities by item count and their previously selected category. Unit, supplier, and location text stays on existing records when an option changes. Supplier and location suggestions also accept manual entries for one-off values. Supplier suggestions are published explicitly by administrators because expense supplier names can be scoped to individual projects or subcontractors. Roles and workflow statuses are application rules.

- Existing-record edits use a shared native modal dialog. Detail pages open it from their header and directory rows open it over the current list. Successful saves refresh the underlying record or list. The existing create, review, and budget-adjustment entry points remain available.

- Breadcrumbs use the resource hierarchy and known entry points such as the approvals queue, reports, and subcontractor assignment lists. Record labels are resolved using the user's access scope.
