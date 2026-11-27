# Financial Business Rules

## Definitions
- Project budget: upper limit on total assigned subcontractor allocations (MVP).
- Assignment budget: initial allocation plus signed authorized adjustments.
- Approved spent: sum of approved expense totals for the assignment.
- Remaining: assignment budget minus approved spent.
- Pending exposure: sum of pending expenses; displayed separately, not deducted from official remaining.
- Utilization: approved spent / assignment budget × 100, with defined zero-budget display (`N/A`).

## Expense lines
Line total = quantity × unit price, using decimal arithmetic and PHP currency rounding rules (2 decimal places at line total). Expense total = sum of rounded line totals. Units are stored as explicit text or controlled codes (`kg`, `bag`, `pcs`, `roll`, etc.). Quantity and unit price must be positive, with supported decimal precision.

## Invariants
1. Each expense belongs to one project-subcontractor assignment.
2. A subcontractor can only see or submit for authorized assignments.
3. Pending/rejected/draft do not count as spent.
4. Approvals must re-evaluate remaining budget in one atomic transaction, with appropriate locking/isolation to avoid concurrent overspend.
5. Duplicate approvals and status transitions are idempotently rejected or safely handled.
6. Approved financial records are immutable; use explicit reversal/correction process if needed, not silent editing/deletion. For MVP, corrections require an admin-created compensating adjustment or a documented reversal action with audit history; choose and document the implementation.
7. Budget decreases cannot reduce assignment budget below already approved spent.
8. Total active assignment budgets cannot exceed project budget; project budget cannot be lowered below active allocated budgets.
9. Approval/rejection captures actor, timestamp, and remarks; rejection requires reason.
10. No subcontractor self-approval.
11. Pending exposure is advisory, not reserved; approvals can be denied for insufficient remaining balance.
12. Attachments must have validated file types, size limits and authorization-protected access.

## Example
Budget PHP 600,000. Screws 10 kg × PHP 250 = PHP 2,500; cement 5 bags × PHP 300 = PHP 1,500. Approved total PHP 4,000; remaining PHP 596,000; utilization 0.67% rounded for display.

## Open question
If client needs actual cash released, cash advances, receipts against disbursements, and unliquidated balances, a separate cash ledger and reconciliation workflow are required and are **not** included in this MVP.
