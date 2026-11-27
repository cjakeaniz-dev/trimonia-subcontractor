import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma, Project, Subcontractor } from "@prisma/client";
import { EditDialog } from "@/components/edit-dialog";
import { ActionForm } from "@/components/forms";
import { DataTable } from "@/components/table";
import { badge, Cards, dateOnly, Field, Filters, Heading, Input, link, pageOf, pageSize, Pages, Panel, Select, statuses, SuggestedInput, text, type Query } from "@/components/view";
import { assignmentScope, companyScope, projectScope, type Actor } from "@/lib/access";
import { db } from "@/lib/db";
import { projectCommitted } from "@/lib/finance";
import { php } from "@/lib/rules";
import { AssignmentList } from "./assignments";

async function ProjectForm({ project }: { project?: Project }) {
  const locations = await db.masterData.findMany({ where: { kind: "LOCATION", isActive: true }, orderBy: { name: "asc" } });
  return <ActionForm operation="project" id={project?.id} confirm={project ? "Save these project and budget changes?" : undefined}>
    <div className="fields">
      <Input label="Project code" name="code" defaultValue={project?.code} required maxLength={180}/>
      <Input label="Name" name="name" defaultValue={project?.name} required maxLength={180}/>
      <SuggestedInput label="Location" name="location" defaultValue={project?.location} values={locations.map(row => row.name)}/>
      <Input label="Budget ceiling (PHP)" name="budget" inputMode="decimal" defaultValue={project?.budget.toFixed(2)} required/>
      <Input label="Start date" name="startDate" type="date" defaultValue={project && dateOnly(project.startDate)} required/>
      <Input label="Target date" name="targetDate" type="date" defaultValue={project && dateOnly(project.targetDate)} required/>
      <Select label="Status" name="status" options={statuses} value={project?.status ?? "ACTIVE"}/>
    </div>
    <Field label="Description"><textarea name="description" defaultValue={project?.description} maxLength={3000}/></Field>
  </ActionForm>;
}

function CompanyForm({ company }: { company?: Subcontractor }) {
  return <ActionForm operation="company" id={company?.id}>
    <div className="fields">
      <Input label="Company name" name="companyName" defaultValue={company?.companyName} required maxLength={180}/>
      <Input label="Contact name" name="contactName" defaultValue={company?.contactName} required maxLength={180}/>
      <Input label="Email" name="email" type="email" defaultValue={company?.email} required maxLength={254}/>
      <Input label="Phone" name="phone" type="tel" defaultValue={company?.phone} required maxLength={180}/>
    </div>
    <label><input type="checkbox" name="isActive" defaultChecked={company?.isActive ?? true}/>Active</label>
  </ActionForm>;
}

export async function Projects({ actor, query }: { actor: Actor; query: Query }) {
  const q = text(query, "q");
  const selectedStatus = text(query, "status");
  const where: Prisma.ProjectWhereInput = { AND: [projectScope(actor), {
    status: selectedStatus === "ACTIVE" || selectedStatus === "ARCHIVED" ? selectedStatus : undefined,
    OR: q ? ["code", "name", "location"].map(key => ({ [key]: { contains: q, mode: "insensitive" as const } })) : undefined,
  }] };
  const [rows, count] = await Promise.all([
    db.project.findMany({ where, orderBy: [{ code: "asc" }, { id: "asc" }], take: pageSize, skip: (pageOf(query) - 1) * pageSize }),
    db.project.count({ where }),
  ]);
  const showBudget = actor.role !== "SUBCONTRACTOR";
  return <><Heading title="Projects">{actor.role === "ADMIN" && <Link href="/projects/new" className="button">New project</Link>}</Heading>
    <Panel><Filters><Input label="Search" name="q" defaultValue={q} placeholder="Code, project or location"/>
      <Select label="Status" name="status" value={selectedStatus} placeholder="All statuses" options={statuses}/>
    </Filters>
    <DataTable columns={["Project", "Code", "Location", ...(showBudget ? ["Budget ceiling"] : []), "Status"]} rows={rows.map(row => [
      link(row.name, "/projects/" + row.id), row.code, row.location, ...(showBudget ? [php(row.budget)] : []), badge(row.status),
    ])}/>
    <Pages path="/projects" query={query} count={count}/></Panel></>;
}

export function NewProject({ actor }: { actor: Actor }) {
  if (actor.role !== "ADMIN") notFound();
  return <><Heading title="New project"/><Panel><ProjectForm/></Panel></>;
}

export async function ProjectDetail({ actor, id, query }: { actor: Actor; id: string; query: Query }) {
  const project = await db.project.findFirst({ where: { AND: [projectScope(actor), { id }] } });
  if (!project) notFound();
  const scopedAssignments = { AND: [assignmentScope(actor), { projectId: id, status: "ACTIVE" as const }] };
  const [assigned, totals] = await Promise.all([
    actor.role === "SUBCONTRACTOR" ? null : projectCommitted(db, id),
    db.expense.groupBy({ by: ["status"], where: { assignment: scopedAssignments, status: { in: ["APPROVED", "PENDING"] } }, _sum: { total: true } }),
  ]);
  const summary = totals.flatMap(row => row._sum.total ? [{ label: row.status === "APPROVED" ? "Approved spending" : "Pending exposure", value: php(row._sum.total) }] : []);
  return <><Heading title={project.name} subtitle={project.code + " · " + project.location}>
    {actor.role === "ADMIN" && <div className="flex flex-wrap gap-2">
      <EditDialog title="Edit project"><ProjectForm project={project}/></EditDialog>
      <Link className="button" href={`/projects/${id}/assignments`}>Manage assignments</Link>
    </div>}
    </Heading>
    <Panel title="Project details">
      <dl className="grid gap-3 sm:grid-cols-4">
        <div><dt className="muted">Status</dt><dd className="font-semibold">{badge(project.status).text}</dd></div>
        <div><dt className="muted">Start date</dt><dd>{dateOnly(project.startDate)}</dd></div>
        <div><dt className="muted">Target date</dt><dd>{dateOnly(project.targetDate)}</dd></div>
        {actor.role !== "SUBCONTRACTOR" && <div><dt className="muted">Budget ceiling</dt><dd className="font-semibold">{php(project.budget)}</dd></div>}
      </dl>
      {project.description && <p>{project.description}</p>}
    </Panel>
    <Cards values={[
      ...(assigned ? [{ label: "Active allocations", value: php(assigned) }, { label: "Unallocated budget", value: php(project.budget.sub(assigned)) }] : []),
      ...["Approved spending", "Pending exposure"].map(label => summary.find(row => row.label === label) ?? { label, value: "PHP 0.00" }),
    ]}/>
    <AssignmentList actor={actor} query={query} projectId={id} path={`/projects/${id}`}/>
  </>;
}

export async function Companies({ actor, query }: { actor: Actor; query: Query }) {
  const q = text(query, "q");
  const where = { AND: [companyScope(actor), {
    OR: q ? [{ companyName: { contains: q, mode: "insensitive" as const } }, { contactName: { contains: q, mode: "insensitive" as const } }] : undefined,
  }] };
  const [rows, count] = await Promise.all([
    db.subcontractor.findMany({ where, orderBy: [{ companyName: "asc" }, { id: "asc" }], take: pageSize, skip: (pageOf(query) - 1) * pageSize }),
    db.subcontractor.count({ where }),
  ]);
  return <><Heading title="Subcontractors">{actor.role === "ADMIN" && <Link href="/subcontractors/new" className="button">New subcontractor</Link>}</Heading>
    <Panel><Filters><Input label="Search" name="q" defaultValue={q} placeholder="Company or contact"/></Filters>
      <DataTable columns={["Company", "Contact", "Email", "Status"]} rows={rows.map(row => [
        link(row.companyName, "/subcontractors/" + row.id), row.contactName, row.email, badge(row.isActive ? "ACTIVE" : "INACTIVE"),
      ])}/><Pages path="/subcontractors" query={query} count={count}/>
    </Panel></>;
}

export function NewCompany({ actor }: { actor: Actor }) {
  if (actor.role !== "ADMIN") notFound();
  return <><Heading title="New subcontractor"/><Panel><CompanyForm/></Panel></>;
}

export async function CompanyDetail({ actor, id, query }: { actor: Actor; id: string; query: Query }) {
  const company = await db.subcontractor.findFirst({ where: { AND: [companyScope(actor), { id }] } });
  if (!company) notFound();
  return <><Heading title={company.companyName} subtitle={company.isActive ? "Active subcontractor" : "Inactive subcontractor"}>
    {actor.role === "ADMIN" && <EditDialog title="Edit subcontractor"><CompanyForm company={company}/></EditDialog>}
  </Heading>
    <Panel title="Contact"><p>{company.contactName} · {company.email} · {company.phone}</p></Panel>
    <AssignmentList actor={actor} query={query} companyId={id} path={`/subcontractors/${id}`}/>
  </>;
}

export async function ProjectAssignments({ actor, id, query }: { actor: Actor; id: string; query: Query }) {
  if (actor.role !== "ADMIN") notFound();
  const [project, companies] = await Promise.all([
    db.project.findFirst({ where: { AND: [projectScope(actor), { id }] } }),
    db.subcontractor.findMany({ where: { isActive: true }, orderBy: { companyName: "asc" } }),
  ]);
  if (!project) notFound();
  return <><Heading title="Project assignments" subtitle={project.name}/>
    <AssignmentList actor={actor} query={query} projectId={id} path={`/projects/${id}/assignments`}/>
    <Panel title="Assign subcontractor">
      {project.status === "ACTIVE" && companies.length ? <ActionForm operation="assignment" label="Create assignment" confirm="Allocate this project budget?">
        <input type="hidden" name="projectId" value={id}/><input type="hidden" name="status" value="ACTIVE"/>
        <div className="fields">
          <Select label="Subcontractor" name="subcontractorId" options={companies.map(company => ({ value: company.id, label: company.companyName }))} placeholder="Select subcontractor" required/>
          <Input label="Scope of work" name="scopeOfWork" required maxLength={180}/>
          <Input label="Initial budget (PHP)" name="initialBudget" inputMode="decimal" required/>
        </div>
      </ActionForm> : <p className="muted">An active project and active subcontractor are required.</p>}
    </Panel>
  </>;
}
