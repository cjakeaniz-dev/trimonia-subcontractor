"use server";

import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { mutate } from "@/lib/mutations";
import { RuleError } from "@/lib/rules";
import { requireActor } from "@/lib/session";
import { uploadReceipt } from "@/lib/storage";

export type ActionState = { error?: string; saved?: boolean };

function message(error: unknown) {
  if (error instanceof RuleError) return error.message;
  if (error instanceof ZodError) return error.issues.map(issue => [issue.path.join("."), issue.message].filter(Boolean).join(" — ")).join(". ");
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "That value is already in use.";
    if (["P2003", "P2025"].includes(error.code)) return "A selected record is unavailable.";
    if (error.code === "P2034") return "Records changed while you worked. Try again.";
  }
  console.error("Operation failed", error instanceof Error ? error.name : "Unknown");
  return "Unable to complete the operation. Try again.";
}

export async function submit(_previous: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireActor();
  const operation = String(form.get("operation"));
  const data: Record<string, unknown> = Object.fromEntries(form);
  data.isActive = form.has("isActive");
  data.projectIds = form.getAll("projectIds");
  data.companyIds = form.getAll("companyIds");
  let destination: string;
  try {
    if (operation === "upload") {
      const file = form.get("receipt");
      if (!file || typeof file === "string") throw new RuleError("Select a receipt.");
      await uploadReceipt(actor, String(data.id), file);
      destination = "/expenses/" + data.id;
    } else {
      if (operation === "expense") {
        const rows = new Map<number, Record<string, FormDataEntryValue>>();
        for (const [key, value] of form) {
          const match = /^rows\.(\d{1,2})\.(materialName|quantity|unit|unitPrice)$/.exec(key);
          if (!match) continue;
          const index = Number(match[1]);
          const row = rows.get(index) ?? {};
          row[match[2]] = value;
          rows.set(index, row);
        }
        data.items = [...rows].sort(([a], [b]) => a - b).map(([, row]) => row);
      }
      destination = await mutate(actor, operation, data);
    }
  } catch (error) { return { error: message(error) }; }
  if (form.get("editDialog") === "1") return { saved: true };
  revalidatePath("/", "layout");
  if (operation === "user" && !data.id) redirect("/users?q=" + encodeURIComponent(String(data.email).trim()));
  redirect(destination);
}

export async function login(_previous: ActionState, form: FormData): Promise<ActionState> {
  try { await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirectTo: "/dashboard" }); }
  catch (error) {
    if (error instanceof AuthError) return { error: "Sign-in failed. Check your credentials or try again later." };
    throw error;
  }
  return {};
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
