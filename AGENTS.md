# Agent Operating Instructions

Build the Construction Contractor & Subcontractor Budget Monitoring MVP described in `docs/`. Read `docs/README.md` and all linked documentation before implementation.

## Autonomous execution
- Continue through tasks in `docs/tasks.md` without requesting approval between phases.
- Inspect existing code before editing; preserve working functionality.
- Implement one coherent task, add tests, run checks, fix failures, update docs/tasks.md, then proceed.
- Do not stop at planning, scaffolding, or mock UI. All pages must connect to actual persistence.
- Keep scope strictly within MVP. Record decisions and assumptions in `docs/decisions.md`.
- Never claim tests, deployments, or integrations succeeded unless verified.
- If blocked by missing secrets or external services, document the blocker and work on independent tasks.
- At context or execution limits, leave a detailed checkpoint in `docs/tasks.md` and `docs/progress.md` so another Codex run can resume.
- Do not use destructive operations on existing user data.

## Definition of done
Migrations and seed work; authentication and RBAC work; projects, subcontractors, assignments, budgets, expenses, receipt uploads, approvals, dashboard, reports, and audit trail are functional; automated critical-path tests pass; production build passes; documentation is accurate.
