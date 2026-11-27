import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditDialog } from "@/components/edit-dialog";
import { ActionForm } from "@/components/forms";
import { DataTable } from "@/components/table";
import { badge, Cards, dateOnly, dateTime, Filters, Heading, Input, link, pageOf, pageSize, Pages, Panel, Select, statuses, text, type Query } from "@/components/view";
import { assignmentScope, expenseScope, type Actor } from "@/lib/access";
import { db } from "@/lib/db";
import { balances, budgetFor } from "@/lib/finance";
import { php } from "@/lib/rules";

export async function AssignmentList({ actor, query, path, projectId, companyId }: {
  actor: Actor; query: Query; path: string; projectId?: string; companyId?: string;
}) {
  const q = text(query, "q");
  const source = companyId ? "?from=subcontractor" : path.endsWith("/assignments") ? "?from=project-assignments" : "";
  const s = text(query, "status");
  const where: Prisma.ProjectSubcontractorWhereInput = { AND: [assignmentScope(actor), {
    projectId, subcontractorId: companyId, status: s === "ACTIVE" || s === "ARCHIVED" ? s : undefined,
    OR: q ? [
      { scopeOfWork: { contains: q, mode: "insensitive" as const } },
      { project: { name: { contains: q, mode: "insensitive" as const } } },
      { subcontractor: { companyName: { contains: q, mode: "insensitive" as const } } },
    ] : undefined,
  }] };
  const [rows, count] = await Promise.all([
    db.projectSubcontractor.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], include: { project: true, subcontractor: true, adjustments: true },
      take: pageSize, skip: (pageOf(query) - 1) * pageSize }),
    db.projectSubcontractor.count({ where }),
  ]);
  return <Panel title="Assignments">
    <Filters><Input label="Search" name="q" defaultValue={q} placeholder="Scope, project or company"/>
    <Select label="Status" name="status" options={statuses} value={s} placeholder="All statuses"/></Filters>
    <DataTable columns={["Scope of work", "Project", "Subcontractor", "Budget", "Status"]} rows={rows.map(row => [
      link(row.scopeOfWork, "/assignments/" + row.id + source), row.project.name, row.subcontractor.companyName, php(budgetFor(row)), badge(row.status),
    ])}/>
    <Pages path={path} query={query} count={count}/>
  </Panel>;
}

export async function AssignmentDetail({ actor, id, query }: { actor: Actor; id: string; query: Query }) {
  const assignment = await db.projectSubcontractor.findFirst({
    where: { AND: [assignmentScope(actor), { id }] },
    include: { project: true, subcontractor: true, adjustments: { orderBy: { createdAt: "desc" } } },
  });
  if (!assignment) notFound();
  const expenseWhere = { AND: [expenseScope(actor), { assignmentId: id }] };
  const [summary, expenses, count] = await Promise.all([
    balances(db, assignment),
    db.expense.findMany({ where: expenseWhere, orderBy: [{ transactionDate: "desc" }, { id: "asc" }], take: pageSize, skip: (pageOf(query) - 1) * pageSize }),
    db.expense.count({ where: expenseWhere }),
  ]);
  const active = assignment.status === "ACTIVE" && assignment.project.status === "ACTIVE" && assignment.subcontractor.isActive;
  return <><Heading featured title={assignment.scopeOfWork} subtitle={`${assignment.project.name} · ${assignment.subcontractor.companyName} · ${badge(assignment.status).text}`}>
    <div className="flex flex-wrap gap-2">
      {actor.role === "ADMIN" && <EditDialog title="Edit assignment"><ActionForm operation="assignment" id={id} confirm="Save these assignment changes?">
        <input type="hidden" name="projectId" value={assignment.projectId}/>
        <input type="hidden" name="subcontractorId" value={assignment.subcontractorId}/>
        <input type="hidden" name="initialBudget" value={assignment.initialBudget.toFixed(2)}/>
        <div className="fields"><Input label="Scope of work" name="scopeOfWork" defaultValue={assignment.scopeOfWork} required maxLength={180}/>
          <Select label="Status" name="status" options={statuses} value={assignment.status}/></div>
      </ActionForm></EditDialog>}
      {active && <Link className="button" href={"/expenses/new?assignment=" + id}>New expense</Link>}
    </div>
  </Heading>
    <Cards values={[
      { label: "Assignment budget", icon: "budget", value: php(summary.budget), detail: "Includes adjustments" },
      { label: "Approved spending", icon: "spending", value: php(summary.approved), detail: summary.utilization === null ? "Utilization N/A" : summary.utilization.toFixed(2) + "% utilized" },
      { label: "Remaining", icon: "remaining", value: php(summary.remaining) }, { label: "Pending exposure", icon: "pending", value: php(summary.pending) },
    ]}/>
    {summary.utilization?.gte(80) && <p className="error" role="status">{summary.utilization.gte(100) ? "Budget ceiling reached." : "At least 80% of the budget is used."}</p>}
    <Panel title="Expenses"><DataTable columns={["Supplier", "Date", "Status", "Total"]} rows={expenses.map(row => [
      link(row.supplier, "/expenses/" + row.id + "?from=assignment"), dateOnly(row.transactionDate), badge(row.status), php(row.total),
    ])}/><Pages path={"/assignments/" + id} query={query} count={count}/></Panel>
    <Panel title="Budget adjustments"><DataTable columns={["Date", "Amount", "Reason"]} rows={assignment.adjustments.map(row => [
      dateTime(row.createdAt), php(row.delta), row.reason,
    ])}/>
    {actor.role === "ADMIN" && active && <ActionForm operation="adjust" id={id} label="Apply adjustment" confirm="Apply this change to the assignment budget?">
      <div className="fields"><Input label="Signed adjustment (PHP)" name="delta" inputMode="decimal" required/>
        <Input label="Reason" name="reason" maxLength={180} required/></div>
    </ActionForm>}</Panel>
  </>;
}
