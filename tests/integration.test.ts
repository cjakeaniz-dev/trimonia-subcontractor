import assert from "node:assert/strict";
import { File } from "node:buffer";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { expenseScope, projectScope } from "../src/lib/access";
import { db } from "../src/lib/db";
import { balances } from "../src/lib/finance";
import { mutate } from "../src/lib/mutations";
import { reportWhere } from "../src/lib/report";
import { receiptLink, uploadReceipt } from "../src/lib/storage";

const enabled = process.env.CCBM_INTEGRATION === "1";
const withStorage = Boolean(process.env.S3_BUCKET);
after(() => db.$disconnect());

test("PostgreSQL workflow enforces scoped access and serializes budget decisions", { skip: !enabled }, async t => {
  const run = randomUUID();
  const admin = await db.user.create({ data: {
    name: "Integration Admin", role: "ADMIN", email: `admin-${run}@example.test`, passwordHash: "integration-only",
  } });
  const last = (path: string) => path.split(/[=/]/).at(-1)!;
  const create = async (operation: string, data: Record<string, unknown>) => last(await mutate(admin, operation, data));
  const projectData = { name: "Test Build", description: "", location: "Manila", startDate: "2026-01-01", targetDate: "2026-12-01", budget: "1000000", status: "ACTIVE" };
  const projectId = await create("project", { ...projectData, code: "P-" + run });
  const hiddenProject = await create("project", { ...projectData, code: "H-" + run });
  const company = (companyName: string) => create("company", { companyName, contactName: "Contact", email: "contact@example.test", phone: "12345", isActive: true });
  const [companyId, otherCompany] = await Promise.all([company("Electrical"), company("Plumbing")]);
  const account = async (role: string, projectIds: string[], companyIds: string[]) => {
    const userId = await create("user", { name: role, email: `${role}-${randomUUID()}@example.test`, role, projectIds, companyIds,
      isActive: true, password: "integration-account-password" });
    return db.user.findUniqueOrThrow({ where: { id: userId } });
  };
  const [manager, submitter, outsider] = await Promise.all([
    account("MANAGER", [projectId], []), account("SUBCONTRACTOR", [], [companyId]), account("SUBCONTRACTOR", [], [otherCompany]),
  ]);
  const allocation = { projectId, subcontractorId: companyId, scopeOfWork: "Electrical installation", initialBudget: "600000", status: "ACTIVE" };
  const assignmentId = await create("assignment", allocation);
  const hiddenAssignment = await create("assignment", { ...allocation, projectId: hiddenProject, subcontractorId: otherCompany });
  await assert.rejects(create("assignment", { ...allocation, subcontractorId: otherCompany, initialBudget: "400000.01" }), /Allocation exceeds/);
  await assert.rejects(mutate(admin, "project", { ...projectData, id: projectId, code: "P-" + run, budget: "599999.99" }), /below the active/);
  await assert.rejects(mutate(manager, "adjust", { id: assignmentId, delta: "1", reason: "Outside role" }), /Administrator/);
  const category = await db.expenseCategory.upsert({ where: { name: "Materials" }, update: {}, create: { name: "Materials" } });
  const rows = [
    { materialName: "Screws", quantity: "10", unit: "kg", unitPrice: "250" },
    { materialName: "Cement", quantity: "5", unit: "bag", unitPrice: "300" },
  ];
  const draft = { assignmentId, categoryId: category.id, transactionDate: "2026-11-20", description: "", supplier: "Hardware " + run, items: rows };
  await t.test("master data is admin-managed and saved draft units survive deactivation", async () => {
    const unit = { kind: "UNIT", name: "Fixture unit " + run, isActive: true };
    await assert.rejects(mutate(manager, "master-data", unit), /Administrator/);
    const customDraft = { ...draft, items: [{ ...rows[0], unit: unit.name }] };
    await assert.rejects(mutate(submitter, "expense", customDraft), /active unit/);
    await mutate(admin, "master-data", unit);
    const saved = await db.masterData.findUniqueOrThrow({
      where: { kind_nameKey: { kind: "UNIT", nameKey: unit.name.toLowerCase() } },
    });
    const expenseId = last(await mutate(submitter, "expense", customDraft));
    await mutate(admin, "master-data", { ...unit, id: saved.id, isActive: false });
    await assert.rejects(mutate(submitter, "expense", customDraft), /active unit/);
    await assert.rejects(mutate(submitter, "expense", {
      ...customDraft, id: expenseId, items: [...customDraft.items, ...customDraft.items],
    }), /active unit/);
    await mutate(submitter, "expense", { ...customDraft, id: expenseId, description: "Existing unit retained" });
    assert.equal((await db.expenseItem.findFirstOrThrow({ where: { expenseId } })).unit, unit.name);
    assert.equal(await db.auditLog.count({ where: { entityType: "MasterData", entityId: saved.id } }), 2);
  });
  const change = (actor: typeof admin, id: string, status: string, remarks = "") => mutate(actor, "transition", { id, status, remarks });
  const add = async (price: string) => {
    const id = last(await mutate(submitter, "expense", { ...draft, items: [{ ...rows[0], quantity: "1", unitPrice: price }] }));
    await change(submitter, id, "PENDING");
    return id;
  };
  const summary = async () => balances(db, await db.projectSubcontractor.findUniqueOrThrow({ where: { id: assignmentId }, include: { adjustments: true } }));
  const expenseId = last(await mutate(submitter, "expense", draft));
  assert.equal((await db.expense.findUniqueOrThrow({ where: { id: expenseId } })).total.toFixed(2), "4000.00");
  assert.equal(await db.expense.count({ where: { AND: [expenseScope(manager), { id: expenseId }] } }), 0);
  await assert.rejects(mutate(outsider, "expense", draft), /unavailable/);
  const hiddenExpense = last(await mutate(outsider, "expense", { ...draft, assignmentId: hiddenAssignment, supplier: "Private supplier " + run }));
  await change(outsider, hiddenExpense, "PENDING");
  assert.equal(await db.expense.count({ where: reportWhere(manager, { project: hiddenProject }) }), 0);
  assert.equal(await db.project.count({ where: { AND: [projectScope(manager), { id: hiddenProject }] } }), 0);
  await assert.rejects(change(manager, hiddenExpense, "APPROVED"), /status/);

  await t.test("private storage serves authorized users only", { skip: !withStorage }, async () => {
    const bytes = "%PDF-1.4\n%%EOF\n";
    const receipt = new File([bytes], "test.pdf", { type: "application/pdf" }) as unknown as globalThis.File;
    await assert.rejects(uploadReceipt(outsider, expenseId, receipt), /own drafts/);
    await uploadReceipt(submitter, expenseId, receipt);
    const file = await db.expenseAttachment.findFirstOrThrow({ where: { expenseId } });
    assert.equal(await receiptLink(outsider, file.id), null);
    assert.equal(await receiptLink(manager, file.id), null);
    const url = await receiptLink(submitter, file.id);
    assert.ok(url);
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), bytes);
    const unsigned = new URL(url);
    unsigned.search = "";
    assert.equal((await fetch(unsigned)).status, 403);
  });

  await change(submitter, expenseId, "PENDING");
  assert.equal((await summary()).remaining.toFixed(2), "600000.00");
  assert.equal((await summary()).pending.toFixed(2), "4000.00");
  await assert.rejects(change(submitter, expenseId, "APPROVED"), /Reviewer/);
  await change(manager, expenseId, "APPROVED", "Verified");
  assert.equal((await summary()).remaining.toFixed(2), "596000.00");
  await assert.rejects(change(manager, expenseId, "APPROVED"), /status/);
  await assert.rejects(mutate(submitter, "expense", { ...draft, id: expenseId }), /own drafts/);
  const rejected = await add("100.00");
  await assert.rejects(change(manager, rejected, "REJECTED", " "), /reason/);
  await change(manager, rejected, "REJECTED", "Duplicate receipt");
  assert.equal((await summary()).approved.toFixed(2), "4000.00");
  await assert.rejects(mutate(admin, "adjust", { id: assignmentId, delta: "-596000.01", reason: "Invalid cut" }), /approved spending/);
  await mutate(admin, "adjust", { id: assignmentId, delta: "10", reason: "Approved increase" });
  const a = await add("400000");
  const b = await add("400000");
  const outcomes = await Promise.allSettled([change(manager, a, "APPROVED"), change(manager, b, "APPROVED")]);
  assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
  assert.match(String(outcomes.find(outcome => outcome.status === "rejected")?.reason), /remaining budget/);
  const result = await summary();
  assert.equal(result.remaining.toFixed(2), "196010.00");
  const report = await db.expense.aggregate({
    where: reportWhere(manager, { project: projectId, status: "APPROVED", from: "2026-11-20", to: "2026-11-20" }), _sum: { total: true },
  });
  assert.ok(report._sum.total?.eq(result.approved));
  assert.equal(await db.auditLog.count({ where: { entityId: expenseId, action: "APPROVED", actorId: manager.id } }), 1);
  assert.equal(await db.auditLog.count({ where: { entityId: assignmentId, action: "ADJUST_BUDGET" } }), 1);

  const contenders = await Promise.allSettled([
    create("assignment", { ...allocation, scopeOfWork: "First concurrent allocation", initialBudget: "300000" }),
    create("assignment", { ...allocation, scopeOfWork: "Second concurrent allocation", initialBudget: "300000" }),
  ]);
  assert.equal(contenders.filter(outcome => outcome.status === "fulfilled").length, 1);
  assert.match(String(contenders.find(outcome => outcome.status === "rejected")?.reason), /exceeds project budget/);
});
