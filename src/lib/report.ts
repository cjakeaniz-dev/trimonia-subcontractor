import type { Prisma } from "@prisma/client";
import { expenseScope, type Actor } from "./access";
import { date, id } from "./rules";

export const expenseDisplay = {
  assignment: { include: { project: true, subcontractor: true } },
  category: true,
} satisfies Prisma.ExpenseInclude;

export function reportWhere(actor: Actor, filters: Record<string, string>, pending = false): Prisma.ExpenseWhereInput {
  const validId = (value: string) => id.safeParse(value).success;
  const start = date.safeParse(filters.from);
  const end = date.safeParse(filters.to);
  const statuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
  return {
    AND: [
      expenseScope(actor),
      {
        assignmentId: validId(filters.assignment) ? filters.assignment : undefined,
        assignment: {
          projectId: validId(filters.project) ? filters.project : undefined,
          subcontractorId: validId(filters.company) ? filters.company : undefined,
        },
        categoryId: validId(filters.category) ? filters.category : undefined,
        status: pending ? "PENDING" : statuses.includes(filters.status) ? filters.status as "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" : undefined,
        transactionDate: { gte: start.success ? start.data : undefined, lte: end.success ? end.data : undefined },
        OR: filters.q ? [
          { supplier: { contains: filters.q, mode: "insensitive" } },
          { description: { contains: filters.q, mode: "insensitive" } },
          { items: { some: { materialName: { contains: filters.q, mode: "insensitive" } } } },
        ] : undefined,
      },
    ],
  };
}

const filterKeys = ["assignment", "project", "company", "category", "status", "from", "to", "q"] as const;
export function reportFilters(read: (key: string) => string) {
  return Object.fromEntries(filterKeys.map(key => [key, read(key).slice(0, 180)]));
}

export function csvRow(values: string[]) {
  return values.map(value => {
    const safe = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(",") + "\r\n";
}
