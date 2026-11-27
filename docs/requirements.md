# Requirements

## Roles
- Admin: manage all projects, subcontractors, assignments, budgets, users, reports and approvals.
- Project Manager: view assigned projects and their subcontractor budgets; submit/review expenses for assigned projects; no user administration or budget allocation edits.
- Subcontractor: view only their company's authorized project assignments; draft and submit their own expenses; view status and remaining budget; cannot approve.

## Functional requirements
1. Login/logout and session expiry, secure password handling.
2. Admin CRUD for projects: code, name, description, location, start/target dates, budget, status.
3. Admin CRUD for subcontractor companies: company name, contact person, contact information, status.
4. Assign subcontractor to project with scope of work, initial budget, assignment status.
5. Enforce project-wide allocation ceiling and adjustment validation.
6. Record expenses with multiple items, category, unit, quantity, unit price, supplier, date, optional description and attachments.
7. Draft → Pending → Approved/Rejected workflow; reject with reason; prohibit unapproved edits to approved transactions.
8. Show dashboard KPIs and alerts for 80% utilization and 100% ceiling.
9. Search, filter and paginate projects, assignments, expenses and approvals.
10. Report by project, subcontractor, category, status, date range; CSV export.
11. Manage users and their project/company memberships.
12. Record important financial and security actions in an audit log.

## Nonfunctional
- Responsive desktop/tablet/mobile web app.
- All financial operations server-authorized and validated.
- UTC timestamps stored; render dates consistently in configured timezone (default Asia/Manila).
- Accessible forms, error/loading/empty states, confirmation dialogs.
- Paginated queries and indexed common filters.
- No permanent mock data in production views; seed demo data for development only.
