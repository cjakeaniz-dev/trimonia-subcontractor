import { Prisma, PrismaClient } from "@prisma/client";

const globalDb = globalThis as typeof globalThis & { ccbmDb?: PrismaClient };
export const db = globalDb.ccbmDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.ccbmDb = db;

export async function transact<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
}
