import Link from "next/link";
import { notFound } from "next/navigation";
import { EditDialog } from "@/components/edit-dialog";
import { ActionForm, ExpenseForm } from "@/components/forms";
import { DataTable } from "@/components/table";
import { badge, Cards, dateOnly, dateTime, expenseStatuses, Field, Filters, Heading, Input, link, pageOf, pageSize, Pages, Panel, queryString, Select, SuggestedInput, text, type Query } from "@/components/view";
import { assignmentScope, companyScope, expenseScope, projectScope, type Actor } from "@/lib/access";
import { db } from "@/lib/db";
import { expenseDisplay, reportFilters, reportWhere } from "@/lib/report";
import { php, zero } from "@/lib/rules";

export async function ExpenseList({ actor, query, kind }: { actor: Actor; query: Query; kind: "expenses" | "approvals" | "reports" }) {
  if (kind === "approvals" && actor.role === "SUBCONTRACTOR") notFound();
  const filters = reportFilters(key => text(query, key));
  const where = reportWhere(actor, filters, kind === "approvals");
  const [rows, count, categories, projects, companies, assignments, totals] = await Promise.all([
    db.expense.findMany({ where, include: expenseDisplay,
      orderBy: kind === "approvals" ? [{ submittedAt: "asc" }, { id: "asc" }] : [{ transactionDate: "desc" }, { id: "asc" }],
      take: pageSize, skip: (pageOf(query) - 1) * pageSize }),
    db.expense.count({ where }),
    db.expenseCategory.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({ where: projectScope(actor), orderBy: { name: "asc" } }),
    db.subcontractor.findMany({ where: companyScope(actor), orderBy: { companyName: "asc" } }),
    db.projectSubcontractor.findMany({ where: assignmentScope(actor), include: { project: true }, orderBy: { scopeOfWork: "asc" } }),
    kind === "reports" ? db.expense.groupBy({ by: ["status"], where, _sum: { total: true } }) : [],
  ]);
  const title = kind === "approvals" ? "Approvals" : kind === "reports" ? "Reports" : "Expenses";
  const subtotal = (status: string) => php(totals.find(row => row.status === status)?._sum.total ?? zero);
  return <><Heading title={title} subtitle={kind === "approvals" ? "Review pending expenses for your projects." : undefined}>
    {kind === "expenses" && <Link className="button" href="/expenses/new">New expense</Link>}
    {kind === "reports" && <a className="button" href={"/api/reports?" + queryString(filters)}>Export CSV</a>}
  </Heading>
    {kind === "reports" && <Cards values={expenseStatuses.map(status => ({ label: status.label, value: subtotal(status.value) }))}/>}
    <Panel><Filters>
      <Input label="Search" name="q" defaultValue={filters.q} placeholder="Supplier or item"/>
      <Select label="Project" name="project" options={projects.map(row => ({ value: row.id, label: row.name }))} value={filters.project} placeholder="All projects"/>
      <Select label="Subcontractor" name="company" options={companies.map(row => ({ value: row.id, label: row.companyName }))} value={filters.company} placeholder="All subcontractors"/>
      <Select label="Assignment" name="assignment" options={assignments.map(row => ({ value: row.id, label: row.project.name + " · " + row.scopeOfWork }))} value={filters.assignment} placeholder="All assignments"/>
      <Select label="Category" name="category" options={categories.map(row => ({ value: row.id, label: row.name }))} value={filters.category} placeholder="All categories"/>
      {kind !== "approvals" && <Select label="Status" name="status" options={expenseStatuses} value={filters.status} placeholder="All statuses"/>}
      <Input label="From" name="from" type="date" defaultValue={filters.from}/><Input label="To" name="to" type="date" defaultValue={filters.to}/>
    </Filters>
    <DataTable columns={["Supplier", "Project", "Subcontractor", "Category", "Date", "Status", "Total"]} rows={rows.map(row => [
      link(row.supplier, "/expenses/" + row.id + (kind === "expenses" ? "" : "?from=" + kind)), row.assignment.project.name, row.assignment.subcontractor.companyName,
      row.category.name, dateOnly(row.transactionDate), badge(row.status), php(row.total),
    ])}/>
    <Pages path={"/" + kind} query={query} count={count}/>
    </Panel></>;
}

export async function ExpenseEditor({ actor, id, query }: { actor: Actor; id?: string; query: Query }) {
  const expense = id ? await db.expense.findFirst({
    where: { AND: [expenseScope(actor), { id, status: "DRAFT", submittedById: actor.id }] },
    include: { items: { orderBy: { position: "asc" } } },
  }) : null;
  if (id && !expense) notFound();
  const [assignments, categories, units, suppliers] = await Promise.all([
    db.projectSubcontractor.findMany({
      where: { AND: [assignmentScope(actor), { id: expense?.assignmentId, status: "ACTIVE", project: { status: "ACTIVE" }, subcontractor: { isActive: true } }] },
      include: { project: true, subcontractor: true }, orderBy: { scopeOfWork: "asc" },
    }),
    db.expenseCategory.findMany({
      where: { OR: [{ isActive: true }, ...(expense ? [{ id: expense.categoryId }] : [])] }, orderBy: { name: "asc" },
    }),
    db.masterData.findMany({ where: { kind: "UNIT", isActive: true }, orderBy: { name: "asc" } }),
    db.masterData.findMany({ where: { kind: "SUPPLIER", isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const unitOptions = units.map(unit => ({ value: unit.name, label: unit.name }));
  const activeNames = new Set(units.map(unit => unit.name));
  for (const unit of new Set(expense?.items.map(item => item.unit))) {
    if (!activeNames.has(unit)) unitOptions.push({ value: unit, label: unit + " (saved)" });
  }
  const selected = expense?.assignmentId ?? text(query, "assignment");
  const form = assignments.length && categories.length && unitOptions.length ? <ExpenseForm id={id} units={unitOptions} items={expense?.items.map(row => ({
      materialName: row.materialName, unit: row.unit, quantity: row.quantity.toString(), unitPrice: row.unitPrice.toFixed(2),
    }))}>
      <div className="fields">
        <Select label="Assignment" name="assignmentId" options={assignments.map(row => ({
          value: row.id, label: row.project.name + " · " + row.subcontractor.companyName + " · " + row.scopeOfWork,
        }))} value={assignments.some(row => row.id === selected) ? selected : ""} placeholder="Select assignment" required/>
        <Select label="Category" name="categoryId" options={categories.map(row => ({ value: row.id, label: row.isActive ? row.name : row.name + " (saved)" }))} value={expense?.categoryId} placeholder="Select category" required/>
        <SuggestedInput label="Supplier" name="supplier" defaultValue={expense?.supplier} values={suppliers.map(row => row.name)}/>
        <Input label="Transaction date" name="transactionDate" type="date" defaultValue={expense ? dateOnly(expense.transactionDate) : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())} required/>
      </div>
      <Field label="Description"><textarea name="description" defaultValue={expense?.description} maxLength={3000}/></Field>
    </ExpenseForm> : <p className="muted">An active assignment, expense category, and unit are required.</p>;
  if (id) return form;
  return <><Heading title="New expense" subtitle="Save a draft to attach receipts and submit it for review."/>
    <Panel>{form}</Panel></>;
}

export async function ExpenseDetail({ actor, id, editing = false }: { actor: Actor; id: string; editing?: boolean }) {
  const expense = await db.expense.findFirst({
    where: { AND: [expenseScope(actor), { id }] },
    include: {
      ...expenseDisplay, items: { orderBy: { position: "asc" } },
      attachments: { select: { id: true, originalFilename: true, mimeType: true } },
      submittedBy: { select: { name: true } }, reviewedBy: { select: { name: true } },
    },
  });
  if (!expense) notFound();
  const draft = expense.status === "DRAFT" && expense.submittedById === actor.id;
  const active = expense.assignment.status === "ACTIVE" && expense.assignment.project.status === "ACTIVE" && expense.assignment.subcontractor.isActive;
  if (editing && (!draft || !active)) notFound();
  const review = expense.status === "PENDING" && actor.role !== "SUBCONTRACTOR";
  return <><Heading title={expense.supplier} subtitle={expense.assignment.project.name + " · " + expense.assignment.subcontractor.companyName}>
    {draft && active && <EditDialog title="Edit expense draft" trigger="Edit draft" closeHref={editing ? "/expenses/" + id : undefined}>
      <ExpenseEditor actor={actor} id={id} query={{}}/>
    </EditDialog>}
  </Heading>
  <Cards values={[{ label: "Total", value: php(expense.total) }, { label: "Status", value: badge(expense.status).text },
    { label: "Transaction date", value: dateOnly(expense.transactionDate) }, { label: "Category", value: expense.category.name }]}/>
  <Panel title="Expense items">
    {expense.description && <p>{expense.description}</p>}
    <DataTable columns={["Material / service", "Quantity", "Unit", "Unit price", "Line total"]} rows={expense.items.map(row => [
      row.materialName, row.quantity.toString(), row.unit, php(row.unitPrice), php(row.lineTotal),
    ])}/>
    <Link className="font-semibold text-[var(--accent)]" href={"/assignments/" + expense.assignmentId}>View assignment budget</Link>
  </Panel>
  <Panel title="Receipts">
    {expense.attachments.length ? <ul className="grid gap-2">{expense.attachments.map(row => <li key={row.id}>
      <a className="font-semibold text-[var(--accent)] underline" href={"/api/receipts/" + row.id}>{row.originalFilename}</a>
      <a className="ml-3 text-[var(--accent)] underline" href={"/api/receipts/" + row.id + "?preview=1"} target="_blank" rel="noopener noreferrer">Preview<span className="sr-only"> {row.originalFilename}</span></a>
    </li>)}</ul> : <p className="muted">No receipts attached.</p>}
    {draft && active && expense.attachments.length < 10 && <ActionForm operation="upload" id={id} label="Upload receipt">
      <Input label="Receipt (JPG, PNG or PDF, up to 5 MB)" name="receipt" type="file" accept="image/jpeg,image/png,application/pdf" required/>
    </ActionForm>}
  </Panel>
  <Panel title="Status history">
    <p>Draft by {expense.submittedBy.name} · {dateTime(expense.createdAt)}</p>
    {expense.submittedAt && <p>Submitted · {dateTime(expense.submittedAt)}</p>}
    {expense.reviewedAt && <p>{badge(expense.status).text} by {expense.reviewedBy?.name} · {dateTime(expense.reviewedAt)}</p>}
    {expense.reviewRemarks && <p className="whitespace-pre-wrap">{expense.reviewRemarks}</p>}
    {draft && active && <ActionForm operation="transition" id={id} label="Submit for review" confirm="Submit this expense for review?">
      <input type="hidden" name="status" value="PENDING"/>
    </ActionForm>}
  </Panel>
  {review && <div className="grid gap-4 lg:grid-cols-2">
    {active && <Panel title="Approve expense"><ActionForm operation="transition" id={id} label="Approve expense" confirm={`Approve ${php(expense.total)} against this assignment?`}>
      <input type="hidden" name="status" value="APPROVED"/>
      <Field label="Approval remarks (optional)"><textarea name="remarks" maxLength={3000}/></Field>
    </ActionForm></Panel>}
    <Panel title="Reject expense"><ActionForm operation="transition" id={id} label="Reject expense" confirm="Reject this expense?" variant="secondary">
      <input type="hidden" name="status" value="REJECTED"/>
      <Field label="Rejection reason"><textarea name="remarks" required maxLength={3000}/></Field>
    </ActionForm></Panel>
  </div>}
  </>;
}

