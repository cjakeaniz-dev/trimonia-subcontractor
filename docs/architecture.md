# Architecture

## Stack
Next.js App Router, TypeScript strict, PostgreSQL, Prisma, Tailwind CSS, shadcn/ui, Auth.js, React Hook Form + Zod, TanStack Table, Recharts, S3-compatible object storage.

## Approach
Modular monolith with feature folders (`auth`, `projects`, `subcontractors`, `assignments`, `budgets`, `expenses`, `approvals`, `reports`, `users`, `audit`). Server-side mutations through server actions or route handlers with validation and authorization. Keep business rules in reusable server-side services, not client components.

## Security
- Hash passwords with proven password hashing implementation; secure Auth.js session configuration.
- Enforce RBAC and assignment/project scope on server reads, writes, exports and file downloads.
- Zod validation on all untrusted input; never trust UI controls as security boundary.
- Rate-limit authentication and sensitive endpoints where feasible.
- S3-compatible private bucket; signed, short-lived download URLs after access checks.
- Upload allowlist: JPG, PNG, PDF; MIME/content validation and size limit; random object keys.
- Audit all budget and approval operations; avoid leaking sensitive data in logs.
- Secure secrets in environment variables; no credentials committed to repository.

## Concurrency
Use database transactions with serializable isolation or explicit row locking for approval and budget allocation mutations. Retry serialization conflicts in a bounded manner and cover with concurrency tests.

## Money
Use Prisma Decimal / PostgreSQL numeric for monetary values. Avoid JavaScript floats for calculations. Centralize rounding/formatting.
