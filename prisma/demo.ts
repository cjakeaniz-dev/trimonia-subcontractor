import { hash } from "bcryptjs";
import { z } from "zod";
import { db, transact } from "../src/lib/db";
import { audit } from "../src/lib/mutations";

const password = z.string().min(12).refine(value => Buffer.byteLength(value) <= 72);

async function seedDemo() {
  if (process.env.NODE_ENV === "production" || process.env.CCBM_DEMO_SEED !== "1") {
    throw new Error("Set CCBM_DEMO_SEED=1 against a dedicated local demo database.");
  }

  const [adminHash, managerHash, subcontractorHash] = await Promise.all(
    ["DEMO_ADMIN_PASSWORD", "DEMO_MANAGER_PASSWORD", "DEMO_SUBCONTRACTOR_PASSWORD"]
      .map(key => hash(password.parse(process.env[key]), 12)),
  );

  await transact(async tx => {
    const code = "DEMO-001";
    if (await tx.project.findUnique({ where: { code } })) return;

    const admin = await tx.user.create({
      data: { name: "Demo Administrator", email: "admin@siteledger.test", role: "ADMIN", passwordHash: adminHash },
    });
    const manager = await tx.user.create({
      data: { name: "Demo Project Manager", email: "manager@siteledger.test", role: "MANAGER", passwordHash: managerHash },
    });
    const subcontractor = await tx.user.create({
      data: { name: "Demo Subcontractor", email: "subcontractor@siteledger.test", role: "SUBCONTRACTOR", passwordHash: subcontractorHash },
    });
    const project = await tx.project.create({
      data: {
        code, name: "Quezon City Office Fit-Out", location: "Quezon City",
        description: "Sample project for tracking electrical materials and labor.",
        startDate: new Date("2026-11-01"), targetDate: new Date("2027-02-28"),
        budget: "1000000", managers: { create: { userId: manager.id } },
      },
    });
    const company = await tx.subcontractor.create({
      data: {
        companyName: "Demo Electrical Services", contactName: subcontractor.name,
        email: subcontractor.email, phone: "00000000000",
        members: { create: { userId: subcontractor.id } },
      },
    });
    const assignment = await tx.projectSubcontractor.create({
      data: { projectId: project.id, subcontractorId: company.id, initialBudget: "600000", scopeOfWork: "Electrical fit-out" },
    });
    const category = await tx.expenseCategory.findUniqueOrThrow({ where: { name: "Materials" } });
    const submittedAt = new Date();
    const expense = await tx.expense.create({
      data: {
        assignmentId: assignment.id, categoryId: category.id, submittedById: subcontractor.id,
        supplier: "Demo Hardware", transactionDate: submittedAt, submittedAt, status: "PENDING",
        description: "Sample materials for manager review.", total: "4000",
        items: { create: [
          { position: 0, materialName: "Screws", quantity: "10", unit: "kg", unitPrice: "250", lineTotal: "2500" },
          { position: 1, materialName: "Cement", quantity: "5", unit: "bag", unitPrice: "300", lineTotal: "1500" },
        ] },
      },
    });
    await audit(tx, admin, "DEMO_SEED", "Project", project.id, null, { code, assignmentId: assignment.id, expenseId: expense.id });
  });
}

seedDemo()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
