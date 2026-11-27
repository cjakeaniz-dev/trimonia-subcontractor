import { Prisma } from "@prisma/client";
import { zero } from "./rules";

export const assignmentFinance = {
  initialBudget: true,
  adjustments: { select: { delta: true } },
} satisfies Prisma.ProjectSubcontractorSelect;
type Allocation = Prisma.ProjectSubcontractorGetPayload<{ select: typeof assignmentFinance }>;

export function budgetFor(assignment: Allocation) {
  return assignment.adjustments.reduce((sum, row) => sum.add(row.delta), assignment.initialBudget);
}

export async function balances(tx: Prisma.TransactionClient, assignment: Allocation & { id: string }) {
  const totals = await tx.expense.groupBy({
    by: ["status"],
    where: { assignmentId: assignment.id, status: { in: ["PENDING", "APPROVED"] } },
    _sum: { total: true },
  });
  return summarize(assignment, totals);
}

type StatusTotal = { status: string; _sum: { total: Prisma.Decimal | null } };
export function summarize(assignment: Allocation, totals: StatusTotal[]) {
  const budget = budgetFor(assignment);
  const approved = totals.find(row => row.status === "APPROVED")?._sum.total ?? zero;
  const pending = totals.find(row => row.status === "PENDING")?._sum.total ?? zero;
  const utilization = budget.isZero() ? null : approved.div(budget).mul(100);
  return { budget, approved, pending, remaining: budget.sub(approved), utilization };
}

export async function projectCommitted(tx: Prisma.TransactionClient, projectId: string, exclude?: string) {
  const assignments = await tx.projectSubcontractor.findMany({
    where: { projectId, status: "ACTIVE", ...(exclude ? { id: { not: exclude } } : {}) },
    select: assignmentFinance,
  });
  return assignments.reduce((sum, assignment) => sum.add(budgetFor(assignment)), zero);
}
