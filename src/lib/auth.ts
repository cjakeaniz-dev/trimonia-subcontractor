import { createHash } from "node:crypto";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "./db";

const credentials = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(72).refine(value => Buffer.byteLength(value) <= 72),
});
const dummyHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx09rsQT2iVwPEMGFiYWdS5w/Le";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(input) {
      const parsed = credentials.safeParse(input);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const key = createHash("sha256").update(email).digest("hex");
      const [limit] = await db.$queryRaw<{ attempts: number }[]>`
        INSERT INTO "LoginThrottle" ("key", "attempts", "expiresAt")
        VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
        ON CONFLICT ("key") DO UPDATE SET
          "attempts" = CASE WHEN "LoginThrottle"."expiresAt" <= NOW() THEN 1 ELSE LEAST("LoginThrottle"."attempts" + 1, 11) END,
          "expiresAt" = CASE WHEN "LoginThrottle"."expiresAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "LoginThrottle"."expiresAt" END
        RETURNING "attempts"`;
      if (limit.attempts > 10) return null;
      const user = await db.user.findUnique({ where: { email } });
      const matches = await compare(password, user?.passwordHash ?? dummyHash);
      if (!matches || !user?.isActive) return null;
      await db.loginThrottle.deleteMany({ where: { key } });
      await db.auditLog.create({ data: { actorId: user.id, action: "SIGN_IN", entityType: "User", entityId: user.id } });
      return { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion };
    },
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user && "sessionVersion" in user) token.sessionVersion = user.sessionVersion;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      return Object.assign(session, { sessionVersion: token.sessionVersion });
    },
  },
});
