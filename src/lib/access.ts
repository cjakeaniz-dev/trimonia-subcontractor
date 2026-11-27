import type { Prisma, Role } from "@prisma/client";

export type Actor = { id: string; role: Role };

export function assignmentScope(actor: Actor): Prisma.ProjectSubcontractorWhereInput {
  switch (actor.role) {
    case "ADMIN": return {};
    case "MANAGER": return { project: { managers: { some: { userId: actor.id } } } };
    case "SUBCONTRACTOR": return { subcontractor: { isActive: true, members: { some: { userId: actor.id } } } };
  }
}

export function projectScope(actor: Actor): Prisma.ProjectWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "MANAGER") return { managers: { some: { userId: actor.id } } };
  return { assignments: { some: assignmentScope(actor) } };
}

export function companyScope(actor: Actor): Prisma.SubcontractorWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "MANAGER") return { assignments: { some: assignmentScope(actor) } };
  return { isActive: true, members: { some: { userId: actor.id } } };
}

export function expenseScope(actor: Actor): Prisma.ExpenseWhereInput {
  return {
    assignment: assignmentScope(actor),
    ...(actor.role === "ADMIN" ? {} : { OR: [{ status: { not: "DRAFT" } }, { submittedById: actor.id }] }),
  };
}
