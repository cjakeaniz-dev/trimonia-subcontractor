# MVP Scope

## Goal
Provide a web app for a general construction contractor to monitor subcontractor-specific expense budgets, material purchases, approval status, and remaining allocations.

## Example
Electrical subcontractor assigned PHP 600,000. An expense includes screws 10 kg × PHP 250 = PHP 2,500 and cement 5 bags × PHP 300 = PHP 1,500. Submitted items await review; approved items count toward spent budget; remaining balance is PHP 596,000 after approval if no other approved expenses exist.

## Included
- Secure authentication and role/project-scoped access
- Projects and subcontractor profiles
- Project-subcontractor assignments and budgets
- Budget adjustments with reasons and audit trail
- Expense requests with multiple item lines, categories, suppliers, dates, receipt attachments
- Approval/rejection and budget enforcement
- Dashboard and searchable tables
- Reports and CSV export
- User management and audit events
- Responsive light/dark interface

## Excluded
- Full accounting/GL, tax filing, invoicing, payroll
- Cash advances, actual disbursement, liquidation/reconciliation
- Purchase orders, inventory stock ledger, warehouse management
- Construction scheduling/Gantt, progress billing
- Offline sync, mobile native app, GPS/biometrics
- Payment gateway, AI, multi-company SaaS billing

## Assumptions
Single contractor organization; PHP as default currency; contractor administrators control project budgets. Scope of project manager permissions is limited to explicitly assigned projects. Multiple subcontractor assignments may exist within a project; an assignment is the financial tracking boundary.
