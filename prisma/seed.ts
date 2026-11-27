import { existsSync } from "node:fs";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "../src/lib/db";

async function seed() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const rawEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const rawPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (rawEmail || rawPassword) {
    const email = z.email().parse(rawEmail?.trim().toLowerCase());
    const password = z.string().min(12).max(72).refine(value => Buffer.byteLength(value) <= 72).parse(rawPassword);
    await db.user.upsert({
      where: { email },
      update: {},
      create: { name: "Administrator", email, role: "ADMIN", passwordHash: await hash(password, 12) },
    });
  }
  for (const name of ["Materials", "Labor", "Equipment", "Transport", "Services", "Other"]) {
    await db.expenseCategory.upsert({ where: { name }, update: {}, create: { name } });
  }
}

seed().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
