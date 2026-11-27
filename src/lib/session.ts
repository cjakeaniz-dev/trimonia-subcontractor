import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

export const currentActor = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id, isActive: true },
    select: { id: true, role: true, name: true, sessionVersion: true },
  });
  return user && "sessionVersion" in session && user.sessionVersion === session.sessionVersion ? user : null;
});

export async function requireActor() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  return actor;
}
