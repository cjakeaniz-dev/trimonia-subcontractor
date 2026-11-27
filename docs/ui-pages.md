# UI Pages

1. `/login` — sign-in, validation, errors.
2. `/dashboard` — role-scoped KPIs, charts, warning alerts, pending approvals.
3. `/projects` — list, search, status filters, create/edit (admin).
4. `/projects/[id]` — project details, assignments, financial summary.
5. `/subcontractors` — directory, create/edit (admin).
6. `/subcontractors/[id]` — profile, authorized assignment history.
7. `/projects/[id]/assignments` — assign subcontractor, set budget, scope of work.
8. `/assignments/[id]` — budget cards, utilization, adjustments, expenses.
9. `/expenses` — list and filters.
10. `/expenses/new` — assignment, category, supplier, date, multiple line items, upload.
11. `/expenses/[id]` — receipt preview, status, history, review actions.
12. `/approvals` — pending queue, approve/reject modal with remarks.
13. `/reports` — project/subcontractor/category/date filters and CSV export.
14. `/users` — admin-only user and membership management.
15. `/audit-logs` — admin-only paginated history.

## UX
Modern construction-oriented enterprise dashboard, sidebar, cards, accessible tables, light/dark mode, mobile responsiveness. Display currency as PHP with 2 decimals. Show pending exposure separately from approved spending. Confirmation dialogs for financial actions. Every screen needs loading, empty, validation and error states.

16. `/master-data` — administrator-only management of units, expense categories, shared supplier suggestions, and project location suggestions.

Project, subcontractor, assignment, and expense-draft details open their edit forms from the page header. User and master-data lists open record-specific edit dialogs from their action columns.
