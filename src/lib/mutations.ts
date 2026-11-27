import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { assignmentScope, expenseScope, type Actor } from "./access";
import { transact } from "./db";
import { balances, budgetFor, projectCommitted } from "./finance";
import { allocation, date, expenseInput, expenseTotals, id, money, note, requireRule, short, status, transition } from "./rules";

const projectData = z.object({ code: short, name: short, description: note, location: short,
  startDate: date, targetDate: date, budget: allocation, status,
}).refine(value => value.targetDate >= value.startDate, "Target date must be on or after the start date");
const companyData = z.object({ companyName: short, contactName: short, email: z.email(), phone: short, isActive: z.boolean() });
const assignmentData = z.object({ projectId: id, subcontractorId: id, scopeOfWork: short, initialBudget: allocation, status });
const userData = z.object({
  name: short, email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  role: z.enum(["ADMIN", "MANAGER", "SUBCONTRACTOR"]), isActive: z.boolean(),
  password: z.union([z.literal(""), z.string().min(12).max(72).refine(value => Buffer.byteLength(value) <= 72)]),
  projectIds: z.array(id).max(500), companyIds: z.array(id).max(500),
});
type Tx = Prisma.TransactionClient;

export function audit(tx: Tx, actor: Actor, action: string, entityType: string, entityId: string, before?: object | null, after?: object) {
  const snapshot = (value?: object | null) => value ? JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue : undefined;
  return tx.auditLog.create({ data: { actorId: actor.id, action, entityType, entityId, beforeJson: snapshot(before), afterJson: snapshot(after) } });
}

export async function verifyActor(tx: Tx, actor: Actor & { sessionVersion?: number }) {
  const active = await tx.user.findFirst({
    where: { id: actor.id, isActive: true, role: actor.role, sessionVersion: actor.sessionVersion }, select: { id: true },
  });
  requireRule(active, "Your access has changed. Sign in again.");
}

export async function mutate(actor: Actor, operation: string, raw: Record<string, unknown>) {
  const recordId = z.union([id, z.literal("")]).parse(raw.id ?? "");
  const adminOperations = ["project", "company", "assignment", "adjust", "user", "master-data"];
  if (adminOperations.includes(operation)) requireRule(actor.role === "ADMIN", "Administrator access is required.");
  const account = operation === "user" ? userData.parse(raw) : null;
  const passwordHash = account?.password ? await hash(account.password, 12) : undefined;

  return transact(async tx => {
    await verifyActor(tx, actor);
    switch (operation) {
      case "master-data": {
        const { kind, name, isActive } = z.object({
          kind: z.enum(["UNIT", "SUPPLIER", "LOCATION", "CATEGORY"]), name: short, isActive: z.boolean(),
        }).parse(raw);
        const data = { name, isActive };
        const action = recordId ? "UPDATE" : "CREATE";
        if (kind === "CATEGORY") {
          const before = recordId ? await tx.expenseCategory.findUniqueOrThrow({ where: { id: recordId } }) : null;
          const duplicate = await tx.expenseCategory.findFirst({
            where: { name: { equals: name, mode: "insensitive" }, id: before ? { not: before.id } : undefined },
          });
          requireRule(!duplicate, "That category name is already in use.");
          const row = before ? await tx.expenseCategory.update({ where: { id: before.id }, data })
            : await tx.expenseCategory.create({ data });
          await audit(tx, actor, action, "ExpenseCategory", row.id, before, row);
        } else {
          const before = recordId ? await tx.masterData.findUniqueOrThrow({ where: { id: recordId, kind } }) : null;
          const values = { ...data, nameKey: name.toLowerCase() };
          const row = before ? await tx.masterData.update({ where: { id: before.id }, data: values })
            : await tx.masterData.create({ data: { ...values, kind } });
          await audit(tx, actor, action, "MasterData", row.id, before, row);
        }
        return "/master-data?kind=" + kind;
      }
      case "project": {
        const data = projectData.parse(raw);
        const before = recordId ? await tx.project.findUniqueOrThrow({ where: { id: recordId } }) : null;
        if (before) requireRule(data.budget.gte(await projectCommitted(tx, before.id)), "Project budget is below the active allocations.");
        const project = before ? await tx.project.update({ where: { id: before.id }, data }) : await tx.project.create({ data });
        await audit(tx, actor, before ? "UPDATE" : "CREATE", "Project", project.id, before, project);
        return "/projects/" + project.id;
      }
      case "company": {
        const data = companyData.parse(raw);
        const before = recordId ? await tx.subcontractor.findUniqueOrThrow({ where: { id: recordId } }) : null;
        const company = before ? await tx.subcontractor.update({ where: { id: before.id }, data }) : await tx.subcontractor.create({ data });
        await audit(tx, actor, before ? "UPDATE" : "CREATE", "Subcontractor", company.id, before, company);
        return "/subcontractors/" + company.id;
      }
      case "assignment": {
        const data = assignmentData.parse(raw);
        const before = recordId ? await tx.projectSubcontractor.findUniqueOrThrow({
          where: { id: recordId }, include: { adjustments: true },
        }) : null;
        const project = await tx.project.findUniqueOrThrow({ where: { id: data.projectId } });
        if (before) requireRule(before.projectId === data.projectId && before.subcontractorId === data.subcontractorId
          && before.initialBudget.eq(data.initialBudget), "Use a budget adjustment to change the original allocation.");
        if (data.status === "ACTIVE") {
          const company = await tx.subcontractor.findUniqueOrThrow({ where: { id: data.subcontractorId } });
          requireRule(project.status === "ACTIVE" && company.isActive, "Project and subcontractor must be active.");
          const allocation = before ? budgetFor(before) : data.initialBudget;
          requireRule((await projectCommitted(tx, project.id, before?.id)).add(allocation).lte(project.budget), "Allocation exceeds project budget.");
        }
        const assignment = before ? await tx.projectSubcontractor.update({
          where: { id: before.id }, data: { scopeOfWork: data.scopeOfWork, status: data.status },
        }) : await tx.projectSubcontractor.create({ data });
        await audit(tx, actor, before ? "UPDATE" : "ALLOCATE", "ProjectSubcontractor", assignment.id, before, assignment);
        return "/assignments/" + assignment.id;
      }
      case "adjust": {
        const delta = money.parse(raw.delta);
        const reason = short.parse(raw.reason);
        requireRule(!delta.isZero(), "Adjustment cannot be zero.");
        const assignment = await tx.projectSubcontractor.findUniqueOrThrow({
          where: { id: id.parse(recordId) }, include: { adjustments: true, project: true },
        });
        requireRule(assignment.status === "ACTIVE" && assignment.project.status === "ACTIVE", "Assignment and project must be active.");
        const summary = await balances(tx, assignment);
        const next = summary.budget.add(delta);
        requireRule(next.gte(summary.approved), "Budget cannot fall below approved spending.");
        const committed = await projectCommitted(tx, assignment.projectId, assignment.id);
        requireRule(committed.add(next).lte(assignment.project.budget), "Adjustment exceeds project budget.");
        const adjustment = await tx.budgetAdjustment.create({ data: { assignmentId: assignment.id, delta, reason, createdById: actor.id } });
        await audit(tx, actor, "ADJUST_BUDGET", "ProjectSubcontractor", assignment.id, { budget: summary.budget }, { budget: next, adjustment });
        return "/assignments/" + assignment.id;
      }
      case "expense": {
        const { items, ...data } = expenseInput.parse(raw);
        const { lines, total } = expenseTotals(items);
        const assignment = await tx.projectSubcontractor.findFirst({
          where: { AND: [assignmentScope(actor), { id: data.assignmentId, status: "ACTIVE", project: { status: "ACTIVE" }, subcontractor: { isActive: true } }] },
        });
        requireRule(assignment, "Assignment is unavailable.");
        const before = recordId ? await tx.expense.findFirst({
          where: { AND: [expenseScope(actor), { id: recordId, submittedById: actor.id, status: "DRAFT", assignmentId: assignment.id }] },
          include: { items: true },
        }) : null;
        requireRule(!recordId || before, "Only your own drafts can be edited.");
        requireRule(before?.categoryId === data.categoryId
          || await tx.expenseCategory.count({ where: { id: data.categoryId, isActive: true } }), "Category is unavailable.");
        const units = [...new Set(lines.map(line => line.unit))];
        const activeUnits = new Set((await tx.masterData.findMany({
          where: { kind: "UNIT", isActive: true, name: { in: units } }, select: { name: true },
        })).map(unit => unit.name));
        const savedUnitCounts = new Map<string, number>();
        for (const item of before?.items ?? []) {
          savedUnitCounts.set(item.unit, (savedUnitCounts.get(item.unit) ?? 0) + 1);
        }
        for (const line of lines) {
          if (activeUnits.has(line.unit)) continue;
          const savedCount = savedUnitCounts.get(line.unit) ?? 0;
          requireRule(savedCount > 0, "Select an active unit for each new expense item.");
          savedUnitCounts.set(line.unit, savedCount - 1);
        }

        const expense = before ? await tx.expense.update({
          where: { id: before.id },
          data: { ...data, total, items: { deleteMany: {}, create: lines } },
          include: { items: true },
        }) : await tx.expense.create({ data: { ...data, total, submittedById: actor.id, items: { create: lines } }, include: { items: true } });
        await audit(tx, actor, before ? "EDIT_DRAFT" : "CREATE_DRAFT", "Expense", expense.id, before, expense);
        return "/expenses/" + expense.id;
      }
      case "transition": {
        const next = z.enum(["PENDING", "APPROVED", "REJECTED"]).parse(raw.status);
        const remarks = note.parse(raw.remarks ?? "");
        const before = await tx.expense.findFirst({
          where: { AND: [expenseScope(actor), { id: id.parse(recordId) }] },
          include: { assignment: { include: { project: true, subcontractor: true, adjustments: true } } },
        });
        requireRule(before && transition(before.status, next), "Expense status no longer allows that action.");
        const { assignment, ...previous } = before;
        if (next === "PENDING") requireRule(before.submittedById === actor.id, "Only the draft owner can submit.");
        else {
          requireRule(actor.role !== "SUBCONTRACTOR", "Reviewer access is required.");
          if (next === "REJECTED") requireRule(remarks, "Enter a rejection reason.");
        }
        if (next !== "REJECTED") requireRule(assignment.status === "ACTIVE" && assignment.project.status === "ACTIVE" && assignment.subcontractor.isActive, "Assignment is unavailable.");
        if (next === "APPROVED") requireRule((await balances(tx, assignment)).remaining.gte(before.total), "Expense exceeds the remaining budget.");
        const expense = await tx.expense.update({
          where: { id: before.id },
          data: next === "PENDING"
            ? { status: next, submittedAt: new Date() }
            : { status: next, reviewedById: actor.id, reviewedAt: new Date(), reviewRemarks: remarks },
        });
        await audit(tx, actor, next, "Expense", expense.id, previous, expense);
        return "/expenses/" + expense.id;
      }
      case "user": {
        requireRule(account, "Invalid account.");
        const { name, email, role, isActive, projectIds, companyIds } = account;
        const select = { id: true, name: true, email: true, role: true, isActive: true, projects: { select: { projectId: true } }, companies: { select: { subcontractorId: true } } } as const;
        const before = recordId ? await tx.user.findUniqueOrThrow({ where: { id: recordId }, select }) : null;
        requireRule(recordId || passwordHash, "A password is required for new users.");
        requireRule(recordId !== actor.id || (role === "ADMIN" && isActive), "You cannot deactivate or demote your own account.");
        const projects = role === "MANAGER" ? [...new Set(projectIds)].map(projectId => ({ projectId })) : [];
        const companies = role === "SUBCONTRACTOR" ? [...new Set(companyIds)].map(subcontractorId => ({ subcontractorId })) : [];
        const data = { name, email, role, isActive };
        const user = before ? await tx.user.update({
          where: { id: before.id }, select,
          data: { ...data, passwordHash, sessionVersion: { increment: 1 }, projects: { deleteMany: {}, create: projects }, companies: { deleteMany: {}, create: companies } },
        }) : await tx.user.create({
          select, data: { ...data, passwordHash: passwordHash!, projects: { create: projects }, companies: { create: companies } },
        });
        await audit(tx, actor, before ? "UPDATE_ACCESS" : "CREATE_USER", "User", user.id, before, user);
        return "/users?id=" + user.id;
      }
      default: throw new Error("Unknown operation");
    }
  });
}
