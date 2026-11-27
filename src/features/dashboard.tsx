import Link from "next/link";
import { SpendingChart } from "@/components/spending-chart";
import { DataTable } from "@/components/table";
import { Cards, Heading, link, Panel } from "@/components/view";
import { assignmentScope, expenseScope, type Actor } from "@/lib/access";
import { transact } from "@/lib/db";
import { summarize } from "@/lib/finance";
import { php, zero } from "@/lib/rules";

export async function Dashboard({ actor }: { actor: Actor }) {
  const { assignments, spending, pendingCount, pending } = await transact(async tx => {
    const active = { AND: [assignmentScope(actor), { status: "ACTIVE" as const, project: { status: "ACTIVE" as const }, subcontractor: { isActive: true } }] };
    const pendingWhere = { AND: [expenseScope(actor), { status: "PENDING" as const }] };
    const [assignments, spending, pendingCount, pending] = await Promise.all([
      tx.projectSubcontractor.findMany({ where: active, include: { project: true, subcontractor: true, adjustments: { select: { delta: true } } } }),
      tx.expense.groupBy({ by: ["assignmentId", "status"], where: { assignment: active, status: { in: ["PENDING", "APPROVED"] } }, _sum: { total: true } }),
      tx.expense.count({ where: pendingWhere }),
      tx.expense.findMany({ where: pendingWhere, take: 5, orderBy: [{ submittedAt: "asc" }, { id: "asc" }], include: { assignment: { include: { project: true } } } }),
    ]);
    return { assignments, spending, pendingCount, pending };
  });
  const byAssignment = new Map<string, typeof spending>();
  for (const row of spending) {
    const entries = byAssignment.get(row.assignmentId) ?? [];
    entries.push(row);
    byAssignment.set(row.assignmentId, entries);
  }
  const summaries = assignments.map(assignment => ({
    ...assignment, ...summarize(assignment, byAssignment.get(assignment.id) ?? []),
  }));
  const sum = (key: "budget" | "approved" | "remaining" | "pending") => summaries.reduce((total, row) => total.add(row[key]), zero);
  const projects = new Map<string, { code: string; approved: typeof zero; pending: typeof zero }>();
  for (const row of summaries) {
    const project = projects.get(row.projectId) ?? { code: row.project.code, approved: zero, pending: zero };
    project.approved = project.approved.add(row.approved);
    project.pending = project.pending.add(row.pending);
    projects.set(row.projectId, project);
  }
  const chart = [...projects.values()].sort((a, b) => b.approved.comparedTo(a.approved) || b.pending.comparedTo(a.pending) || a.code.localeCompare(b.code))
    .slice(0, 10).map(row => ({ code: row.code, approved: row.approved.toNumber(), pending: row.pending.toNumber() }));
  const warnings = summaries.filter(row => row.utilization?.gte(80)).sort((a, b) => b.utilization!.comparedTo(a.utilization!));
  return <><Heading featured title="Dashboard" subtitle="Budget and spending across your active assignments.">
    <Link className="button" href="/expenses/new">New expense</Link>
  </Heading>
    <Cards values={[
      { label: "Allocated budget", icon: "budget", value: php(sum("budget")), detail: summaries.length + " active assignments" },
      { label: "Approved spending", icon: "spending", value: php(sum("approved")) },
      { label: "Remaining budget", icon: "remaining", value: php(sum("remaining")) },
      { label: "Pending exposure", icon: "pending", value: php(sum("pending")), detail: "Active assignments" },
    ]}/>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <Panel title={projects.size > 10 ? "Spending by project · Top 10" : "Spending by project"}><SpendingChart rows={chart}/></Panel>
      <Panel title="Budget alerts">{warnings.length ? <ul className="grid max-h-72 gap-2 overflow-auto">
        {warnings.map(row => <li key={row.id} className="rounded-md border border-[var(--border)] p-3">
          <Link className="font-semibold text-[var(--accent)]" href={"/assignments/" + row.id}>{row.scopeOfWork}</Link>
          <p className="muted text-xs">{row.project.name} · {row.subcontractor.companyName}</p>
          <p className={row.utilization!.gte(100) ? "mt-2 text-[var(--danger)]" : "mt-2"}>{row.utilization!.toFixed(2)}% utilized{row.utilization!.gte(100) ? " · Ceiling reached" : ""}</p>
        </li>)}
      </ul> : <div className="empty-state grid justify-items-center gap-3">
        <span className="metric-icon" data-tone="remaining"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg></span>
        <p>No active assignments have reached 80% utilization.</p>
      </div>}</Panel>
    </div>
    <Panel title={`Pending expenses (${pendingCount})`}>
      <DataTable columns={["Supplier", "Project", "Total"]} rows={pending.map(row => [
        link(row.supplier, "/expenses/" + row.id), row.assignment.project.name, php(row.total),
      ])} empty="No expenses awaiting review."/>
      <div><Link className="button secondary" href={actor.role === "SUBCONTRACTOR" ? "/expenses?status=PENDING" : "/approvals"}>View pending expenses</Link></div>
    </Panel>
  </>;
}
