import Link from "next/link";
import { notFound } from "next/navigation";
import { EditDialog } from "@/components/edit-dialog";
import { ActionForm } from "@/components/forms";
import { DataTable } from "@/components/table";
import { badge, dateTime, display, Filters, Heading, Input, pageOf, pageSize, Pages, Panel, queryString, Select, text, type Query } from "@/components/view";
import type { Actor } from "@/lib/access";
import { db } from "@/lib/db";
import { id } from "@/lib/rules";

export async function Users({ actor, query }: { actor: Actor; query: Query }) {
  if (actor.role !== "ADMIN") notFound();
  const selected = text(query, "id");
  if (selected && selected !== "new" && !id.safeParse(selected).success) notFound();
  const safeSelect = { id: true, name: true, email: true, role: true, isActive: true } as const;
  let editor: React.ReactNode;
  if (selected) {
    const [user, projects, companies] = await Promise.all([
      selected === "new" ? null : db.user.findUnique({
        where: { id: selected }, select: { ...safeSelect, projects: true, companies: true },
      }),
      db.project.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
      db.subcontractor.findMany({ select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
    ]);
    if (!user && selected !== "new") notFound();
    const form = <ActionForm operation="user" id={user?.id} confirm={user ? "Save access changes and sign out this user’s existing sessions?" : undefined}>
        <div className="fields">
          <Input label="Name" name="name" defaultValue={user?.name} required maxLength={180}/>
          <Input label="Email" name="email" type="email" defaultValue={user?.email} required maxLength={254}/>
          <Select label="Role" name="role" value={user?.role ?? "SUBCONTRACTOR"} options={[
            { value: "ADMIN", label: "Administrator" }, { value: "MANAGER", label: "Project manager" }, { value: "SUBCONTRACTOR", label: "Subcontractor" },
          ]}/>
          <Input label={user ? "New password (optional)" : "Password"} name="password" type="password" autoComplete="new-password" required={!user} minLength={12} maxLength={72}/>
        </div>
        <label><input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true}/>Active account</label>
        <div className="fields">
          <fieldset className="grid max-h-72 gap-2 overflow-auto rounded-md border border-[var(--border)] p-3">
            <legend className="font-semibold">Projects for managers</legend>
            {projects.length ? projects.map(row => <label key={row.id}><input type="checkbox" name="projectIds" value={row.id}
              defaultChecked={user?.projects.some(membership => membership.projectId === row.id)}/>{row.code} · {row.name}</label>) : <p className="muted">No projects yet.</p>}
          </fieldset>
          <fieldset className="grid max-h-72 gap-2 overflow-auto rounded-md border border-[var(--border)] p-3">
            <legend className="font-semibold">Companies for subcontractors</legend>
            {companies.length ? companies.map(row => <label key={row.id}><input type="checkbox" name="companyIds" value={row.id}
              defaultChecked={user?.companies.some(membership => membership.subcontractorId === row.id)}/>{row.companyName}</label>) : <p className="muted">No subcontractors yet.</p>}
          </fieldset>
        </div>
      </ActionForm>;
    if (!user) return <><Heading title="New user"><Link className="button secondary" href="/users">All users</Link></Heading>
      <Panel>{form}</Panel></>;
    const back = queryString(query, { id: "" });
    editor = <EditDialog key={user.id} title="Edit user" closeHref={back ? "/users?" + back : "/users"}>{form}</EditDialog>;
  }
  const q = text(query, "q");
  const where = { OR: q ? [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] : undefined };
  const [users, count] = await Promise.all([
    db.user.findMany({ where, select: safeSelect, orderBy: [{ name: "asc" }, { id: "asc" }], take: pageSize, skip: (pageOf(query) - 1) * pageSize }),
    db.user.count({ where }),
  ]);
  return <><Heading title="Users"><Link className="button" href="/users?id=new">New user</Link></Heading>{editor}<Panel>
    <Filters><Input label="Search" name="q" defaultValue={q} placeholder="Name or email"/></Filters>
    <DataTable columns={["Name", "Email", "Role", "Status", "Actions"]} rows={users.map(row => [
      row.name, row.email, display(row.role), badge(row.isActive ? "ACTIVE" : "INACTIVE"),
      { text: "Edit " + row.name, href: "/users?" + queryString(query, { id: row.id }), fullNavigation: true },
    ])}/>
    <Pages path="/users" query={query} count={count}/>
  </Panel></>;
}

export async function AuditLogs({ actor, query }: { actor: Actor; query: Query }) {
  if (actor.role !== "ADMIN") notFound();
  const q = text(query, "q");
  const where = { OR: q ? [
    { action: { contains: q, mode: "insensitive" as const } },
    { entityType: { contains: q, mode: "insensitive" as const } },
    { actor: { name: { contains: q, mode: "insensitive" as const } } },
  ] : undefined };
  const [events, count] = await Promise.all([
    db.auditLog.findMany({ where, include: { actor: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: pageSize, skip: (pageOf(query) - 1) * pageSize }),
    db.auditLog.count({ where }),
  ]);
  return <><Heading title="Audit log"/><Panel>
    <Filters><Input label="Search" name="q" defaultValue={q} placeholder="Action, record type or actor"/></Filters>
    {events.length ? <ul className="grid gap-2">{events.map(event => <li key={event.id} className="rounded-md border border-[var(--border)] px-4 py-3">
      <details><summary className="cursor-pointer font-semibold">{event.action.replaceAll("_", " ")} · {event.entityType} <span className="muted font-normal">· {event.actor.name} · {dateTime(event.createdAt)}</span></summary>
        <p className="muted mt-2 break-all">{event.entityId}</p>
        {(event.beforeJson || event.afterJson) && <div className="fields mt-2">
          <div><h3 className="font-semibold">Before</h3><pre className="overflow-x-auto text-xs">{JSON.stringify(event.beforeJson, null, 2)}</pre></div>
          <div><h3 className="font-semibold">After</h3><pre className="overflow-x-auto text-xs">{JSON.stringify(event.afterJson, null, 2)}</pre></div>
        </div>}
      </details>
    </li>)}</ul> : <p className="muted">No audit events found.</p>}
    <Pages path="/audit-logs" query={query} count={count}/>
  </Panel></>;
}
