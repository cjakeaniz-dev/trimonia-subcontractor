
import { hash } from "bcryptjs";
import { z } from "zod";
import { db, transact } from "../src/lib/db";
import { audit } from "../src/lib/mutations";

const passwordSchema = z
  .string()
  .min(12)
  .refine((value) => Buffer.byteLength(value) <= 72);

function getPassword(key: string): string {
  const result = passwordSchema.safeParse(process.env[key]);

  if (!result.success) {
    throw new Error(
      `${key} is missing or invalid. Password must contain at least 12 characters and no more than 72 bytes.`
    );
  }

  return result.data;
}

async function seedDemo() {
  console.log("[DEMO SEED] Starting demo database seeding...");

  const isProduction = process.env.NODE_ENV === "production";
  const isVercel = process.env.VERCEL === "1";

  const allowCloudDemo =
    process.env.CCBM_ALLOW_CLOUD_DEMO_SEED === "1";

  const demoSeedEnabled =
    process.env.CCBM_DEMO_SEED === "1";

  if (!demoSeedEnabled) {
    throw new Error("CCBM_DEMO_SEED must be set to 1.");
  }

  if ((isProduction || isVercel) && !allowCloudDemo) {
    throw new Error(
      "Cloud demo seeding requires CCBM_ALLOW_CLOUD_DEMO_SEED=1."
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("[DEMO SEED] Environment validation passed.");

  const [adminHash, managerHash, subcontractorHash] =
    await Promise.all([
      hash(getPassword("DEMO_ADMIN_PASSWORD"), 12),
      hash(getPassword("DEMO_MANAGER_PASSWORD"), 12),
      hash(getPassword("DEMO_SUBCONTRACTOR_PASSWORD"), 12),
    ]);

  console.log("[DEMO SEED] Password validation passed.");

  const seeded = await transact(async (tx) => {
    const code = "DEMO-001";

    const existingProject = await tx.project.findUnique({
      where: { code },
    });

    if (existingProject) {
      return false;
    }

    const category = await tx.expenseCategory.findUnique({
      where: { name: "Materials" },
    });

    if (!category) {
      throw new Error(
        'Materials category not found. Run the main database seed first.'
      );
    }

    const admin = await tx.user.create({
      data: {
        name: "Demo Administrator",
        email: "admin@siteledger.test",
        role: "ADMIN",
        passwordHash: adminHash,
      },
    });

    const manager = await tx.user.create({
      data: {
        name: "Demo Project Manager",
        email: "manager@siteledger.test",
        role: "MANAGER",
        passwordHash: managerHash,
      },
    });

    const subcontractor = await tx.user.create({
      data: {
        name: "Demo Subcontractor",
        email: "subcontractor@siteledger.test",
        role: "SUBCONTRACTOR",
        passwordHash: subcontractorHash,
      },
    });

    const project = await tx.project.create({
      data: {
        code,
        name: "Quezon City Office Fit-Out",
        location: "Quezon City",
        description:
          "Sample project for tracking electrical materials and labor.",
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2027-02-28"),
        budget: "1000000",
        managers: {
          create: {
            userId: manager.id,
          },
        },
      },
    });

    const company = await tx.subcontractor.create({
      data: {
        companyName: "Demo Electrical Services",
        contactName: subcontractor.name,
        email: subcontractor.email,
        phone: "00000000000",
        members: {
          create: {
            userId: subcontractor.id,
          },
        },
      },
    });

    const assignment = await tx.projectSubcontractor.create({
      data: {
        projectId: project.id,
        subcontractorId: company.id,
        initialBudget: "600000",
        scopeOfWork: "Electrical fit-out",
      },
    });

    const submittedAt = new Date();

    const expense = await tx.expense.create({
      data: {
        assignmentId: assignment.id,
        categoryId: category.id,
        submittedById: subcontractor.id,
        supplier: "Demo Hardware",
        transactionDate: submittedAt,
        submittedAt,
        status: "PENDING",
        description: "Sample materials for manager review.",
        total: "4000",
        items: {
          create: [
            {
              position: 0,
              materialName: "Screws",
              quantity: "10",
              unit: "kg",
              unitPrice: "250",
              lineTotal: "2500",
            },
            {
              position: 1,
              materialName: "Cement",
              quantity: "5",
              unit: "bag",
              unitPrice: "300",
              lineTotal: "1500",
            },
          ],
        },
      },
    });

    await audit(
      tx,
      admin,
      "DEMO_SEED",
      "Project",
      project.id,
      null,
      {
        code,
        assignmentId: assignment.id,
        expenseId: expense.id,
      }
    );

    return true;
  });

  if (!seeded) {
    console.log("[DEMO SEED] Demo project already exists. Skipping.");
    return;
  }

  console.log("[DEMO SEED] Demo users created successfully.");
  console.log("[DEMO SEED] Demo project created successfully.");
  console.log("[DEMO SEED] Demo subcontractor created successfully.");
  console.log("[DEMO SEED] Demo expenses created successfully.");
  console.log("[DEMO SEED] Database seeding completed successfully!");
}

seedDemo()
  .catch((error) => {
    console.error(
      "[DEMO SEED] Failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
