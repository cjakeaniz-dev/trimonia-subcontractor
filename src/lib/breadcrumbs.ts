import type { Crumb } from "@/components/breadcrumbs";
import { text, type Query } from "@/components/view";
import { assignmentScope, companyScope, expenseScope, projectScope, type Actor } from "./access";
import { db } from "./db";
import { id as uuid } from "./rules";

const sections: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  subcontractors: "Subcontractors",
  expenses: "Expenses",
  approvals: "Approvals",
  reports: "Reports",
  "master-data": "Master data",
  users: "Users",
  "audit-logs": "Audit log",
};

const projects = { label: "Projects", href: "/projects" };
const subcontractors = { label: "Subcontractors", href: "/subcontractors" };
const expenses = { label: "Expenses", href: "/expenses" };

function assignmentTrail(assignment: { id: string; project: { id: string; name: string }; scopeOfWork: string }) {
  return [projects, { label: assignment.project.name, href: "/projects/" + assignment.project.id },
    { label: assignment.scopeOfWork, href: "/assignments/" + assignment.id }];
}

export async function workspaceTrail(actor: Actor, [section, id, detail]: string[], query: Query): Promise<Crumb[]> {
  if (!id && section === "users" && text(query, "id") === "new") {
    return [{ label: "Users", href: "/users" }, { label: "New user" }];
  }
  if (id === "new") {
    switch (section) {
      case "projects": return [projects, { label: "New project" }];
      case "subcontractors": return [subcontractors, { label: "New subcontractor" }];
      case "expenses": {
        const assignmentId = text(query, "assignment");
        const assignment = uuid.safeParse(assignmentId).success ? await db.projectSubcontractor.findFirst({
          where: { AND: [assignmentScope(actor), { id: assignmentId }] },
          select: { id: true, scopeOfWork: true, project: { select: { id: true, name: true } } },
        }) : null;
        return [...(assignment ? assignmentTrail(assignment) : [expenses]), { label: "New expense" }];
      }
    }
  }
  if (uuid.safeParse(id).success) {
    switch (section) {
      case "projects": {
        const row = await db.project.findFirst({ where: { AND: [projectScope(actor), { id }] }, select: { name: true } });
        if (row) return detail === "assignments"
          ? [projects, { label: row.name, href: "/projects/" + id }, { label: "Assignments" }]
          : [projects, { label: row.name }];
        break;
      }
      case "subcontractors": {
        const row = await db.subcontractor.findFirst({ where: { AND: [companyScope(actor), { id }] }, select: { companyName: true } });
        if (row) return [subcontractors, { label: row.companyName }];
        break;
      }
      case "assignments": {
        const row = await db.projectSubcontractor.findFirst({
          where: { AND: [assignmentScope(actor), { id }] },
          select: { id: true, scopeOfWork: true, project: { select: { id: true, name: true } },
            subcontractor: { select: { id: true, companyName: true } } },
        });
        if (row) {
          const from = text(query, "from");
          if (from === "subcontractor") return [subcontractors,
            { label: row.subcontractor.companyName, href: "/subcontractors/" + row.subcontractor.id }, { label: row.scopeOfWork }];
          const parent = assignmentTrail(row).slice(0, -1);
          if (from === "project-assignments" && actor.role === "ADMIN") {
            parent.push({ label: "Assignments", href: "/projects/" + row.project.id + "/assignments" });
          }
          return [...parent, { label: row.scopeOfWork }];
        }
        break;
      }
      case "expenses": {
        const row = await db.expense.findFirst({
          where: { AND: [expenseScope(actor), { id }] },
          select: { supplier: true, assignment: { select: {
            id: true, scopeOfWork: true, project: { select: { id: true, name: true } },
          } } },
        });
        if (row) {
          const from = text(query, "from");
          const parent = from === "assignment" ? assignmentTrail(row.assignment)
            : from === "reports" || (from === "approvals" && actor.role !== "SUBCONTRACTOR")
              ? [{ label: sections[from], href: "/" + from }] : [expenses];
          return detail === "edit" ? [...parent, { label: row.supplier, href: "/expenses/" + id }, { label: "Edit draft" }]
            : [...parent, { label: row.supplier }];
        }
        break;
      }
    }
  }
  return [{ label: sections[section] ?? "Workspace" }];
}
