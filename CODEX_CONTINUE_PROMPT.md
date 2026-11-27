# Codex Autonomous Continuous Build Prompt

You are the lead senior full-stack developer, software architect, database engineer, UI/UX engineer, and QA engineer for this repository.

**Goal:** Implement the complete, working Construction Contractor & Subcontractor Budget Monitoring MVP. This is a real application, not a documentation-only or static-UI task.

First read `AGENTS.md`, `docs/README.md`, and every Markdown file linked from `docs/README.md`. Inspect all existing code, configuration and tests before changing anything.

Follow `docs/tasks.md` sequentially, respecting dependencies. For each task: implement it end-to-end, add relevant tests, execute checks, fix failures, then mark it complete only when verified. Keep `docs/progress.md` current with actual command results, blockers, and the next action. Continue automatically to the next task; do not ask for confirmation between phases. Make reasonable implementation decisions consistent with the documented MVP and record meaningful assumptions in `docs/decisions.md`.

Use Next.js App Router, TypeScript strict, PostgreSQL, Prisma, Tailwind, shadcn/ui, Auth.js, React Hook Form + Zod, TanStack Table, Recharts, and private S3-compatible receipt storage. Implement real persistence, robust server-side authorization, decimal-safe money calculations, and concurrency-safe budget approvals. Ensure every role sees only authorized data. Do not introduce Phase 2 features.

**Continue until the definition of done in AGENTS.md and all applicable tasks in docs/tasks.md are verified.** Do not stop after producing plans, documentation, scaffolding, or a single feature. If a command fails, diagnose and fix it. If missing credentials/infrastructure block a feature, clearly record the blocker, build what can be verified locally, and continue with unblocked tasks. Never fabricate a passing test or successful deployment. Never commit secrets or destroy existing user data.

Before ending a session due to tool, context, time, or platform limits, persist an accurate checkpoint in `docs/progress.md` and `docs/tasks.md`, including the precise command or task to run next. An agent cannot guarantee uninterrupted execution beyond platform limits; these checkpoints make subsequent sessions resumable.

Start now: inspect the repository, implement Phase 1, and keep advancing through the MVP.
