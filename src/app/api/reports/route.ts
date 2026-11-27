import { db } from "@/lib/db";
import { csvRow, expenseDisplay, reportFilters, reportWhere } from "@/lib/report";
import { currentActor } from "@/lib/session";

export async function GET(request: Request) {
  const actor = await currentActor();
  if (!actor) return new Response(null, { status: 401 });
  const query = new URL(request.url).searchParams;
  const where = reportWhere(actor, reportFilters(key => query.get(key) ?? ""));
  const encoder = new TextEncoder();
  let after: string | undefined;
  let header = false;
  const body = new ReadableStream({
    async pull(controller) {
      if (!header) {
        controller.enqueue(encoder.encode("\uFEFF" + csvRow(["Expense ID", "Project", "Subcontractor", "Category", "Supplier", "Date", "Status", "Total (PHP)"])));
        header = true;
        return;
      }
      const rows = await db.expense.findMany({
        where: { AND: [where, after ? { id: { gt: after } } : {}] },
        include: expenseDisplay, orderBy: { id: "asc" }, take: 250,
      });
      if (!rows.length) { controller.close(); return; }
      after = rows.at(-1)?.id;
      controller.enqueue(encoder.encode(rows.map(row => csvRow([
        row.id, row.assignment.project.name, row.assignment.subcontractor.companyName, row.category.name,
        row.supplier, row.transactionDate.toISOString().slice(0, 10), row.status, row.total.toFixed(2),
      ])).join("")));
    },
  });
  return new Response(body, { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="expense-report.csv"', "Cache-Control": "private, no-store",
  } });
}
