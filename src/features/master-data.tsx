import Link from "next/link";
import { notFound } from "next/navigation";
import { EditDialog } from "@/components/edit-dialog";
import { ActionForm } from "@/components/forms";
import { DataTable } from "@/components/table";
import { badge, Heading, Input, Panel, text, type Query } from "@/components/view";
import type { Actor } from "@/lib/access";
import { db } from "@/lib/db";
import { id } from "@/lib/rules";

const groups = [
  { key: "UNIT", label: "Units", name: "Unit" },
  { key: "CATEGORY", label: "Expense categories", name: "Category" },
  { key: "SUPPLIER", label: "Suppliers", name: "Supplier" },
  { key: "LOCATION", label: "Project locations", name: "Location" },
] as const;

export async function MasterData({ actor, query }: { actor: Actor; query: Query }) {
  if (actor.role !== "ADMIN") notFound();
  const group = groups.find(item => item.key === text(query, "kind")) ?? groups[0];
  const orderBy = { name: "asc" as const };
  const rows = group.key === "CATEGORY" ? await db.expenseCategory.findMany({ orderBy })
    : await db.masterData.findMany({ where: { kind: group.key }, orderBy });
  const path = "/master-data?kind=" + group.key;
  const edit = text(query, "edit");
  const selected = id.safeParse(edit).success ? rows.find(row => row.id === edit) : undefined;
  return <>
    <Heading title="Master data" subtitle="Manage the options used in project and expense forms."/>
    <nav aria-label="Master data groups" className="flex flex-wrap gap-2">
      {groups.map(item => <Link key={item.key} href={"/master-data?kind=" + item.key}
        aria-current={item.key === group.key ? "page" : undefined}
        className={item.key === group.key ? "button" : "button secondary"}>{item.label}</Link>)}
    </nav>
    <Panel title={"Add " + group.name.toLowerCase()}>
      <MasterDataForm key={group.key} kind={group.key} name={group.name}/>
    </Panel>
    {selected && <EditDialog key={selected.id} title={"Edit " + group.name.toLowerCase()} closeHref={path}>
      <MasterDataForm kind={group.key} name={group.name} record={selected}/>
    </EditDialog>}
    <Panel title={group.label}>
      <DataTable columns={[group.name, "Status", "Actions"]} rows={rows.map(row => [
        row.name, badge(row.isActive ? "ACTIVE" : "INACTIVE"), { text: "Edit " + row.name, href: path + "&edit=" + row.id, fullNavigation: true },
      ])}/>
    </Panel>
  </>;
}


function MasterDataForm({ kind, name, record }: {
  kind: string; name: string; record?: { id: string; name: string; isActive: boolean };
}) {
  return <ActionForm operation="master-data" id={record?.id}>
    <input type="hidden" name="kind" value={kind}/>
    <Input label={name + " name"} name="name" defaultValue={record?.name} required maxLength={180}/>
    <label><input type="checkbox" name="isActive" defaultChecked={record?.isActive ?? true}/>Active in forms</label>
  </ActionForm>;
}
