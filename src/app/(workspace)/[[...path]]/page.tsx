import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { type Query } from "@/components/view";
import { AuditLogs, Users } from "@/features/admin";
import { AssignmentDetail } from "@/features/assignments";
import { Dashboard } from "@/features/dashboard";
import { Companies, CompanyDetail, NewCompany, NewProject, ProjectAssignments, ProjectDetail, Projects } from "@/features/directories";
import { ExpenseDetail, ExpenseEditor, ExpenseList } from "@/features/expenses";
import { MasterData } from "@/features/master-data";
import type { Actor } from "@/lib/access";
import { workspaceTrail } from "@/lib/breadcrumbs";
import { id as uuid } from "@/lib/rules";
import { requireActor } from "@/lib/session";

export default async function WorkspacePage({ params, searchParams }: {
  params: Promise<{ path?: string[] }>; searchParams: Promise<Query>;
}) {
  const [{ path = [] }, query, actor] = await Promise.all([params, searchParams, requireActor()]);
  if (!path.length) redirect("/dashboard");

  const content = renderPage(actor, path, query);
  const trail = await workspaceTrail(actor, path, query);
  return <Shell name={actor.name} role={actor.role} trail={trail}>{content}</Shell>;
}

function renderPage(actor: Actor, path: string[], query: Query) {
  const [section, id, detail] = path;
  if (path.length === 1) {
    switch (section) {
      case "dashboard": return <Dashboard actor={actor}/>;
      case "projects": return <Projects actor={actor} query={query}/>;
      case "subcontractors": return <Companies actor={actor} query={query}/>;
      case "expenses": case "approvals": case "reports": return <ExpenseList actor={actor} query={query} kind={section}/>;
      case "master-data": return <MasterData actor={actor} query={query}/>;
      case "users": return <Users actor={actor} query={query}/>;
      case "audit-logs": return <AuditLogs actor={actor} query={query}/>;
    }
  }
  if (path.length === 2 && id === "new") {
    if (section === "projects") return <NewProject actor={actor}/>;
    if (section === "subcontractors") return <NewCompany actor={actor}/>;
    if (section === "expenses") return <ExpenseEditor actor={actor} query={query}/>;
  }
  if (!uuid.safeParse(id).success) notFound();
  if (path.length === 2) {
    switch (section) {
      case "projects": return <ProjectDetail actor={actor} id={id} query={query}/>;
      case "subcontractors": return <CompanyDetail actor={actor} id={id} query={query}/>;
      case "assignments": return <AssignmentDetail actor={actor} id={id} query={query}/>;
      case "expenses": return <ExpenseDetail actor={actor} id={id}/>;
    }
  }
  if (path.length === 3 && section === "projects" && detail === "assignments") return <ProjectAssignments actor={actor} id={id} query={query}/>;
  if (path.length === 3 && section === "expenses" && detail === "edit") return <ExpenseDetail actor={actor} id={id} editing/>;
  notFound();
}
