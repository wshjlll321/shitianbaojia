import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const login = String((credentials as any)?.username || "").trim();
          const password = String(credentials?.password || "");
          if (!login || !password) return null;

          const isEmail = login.includes("@");
          const user = await prisma.user.findFirst({
            where: isEmail
              ? { email: login.toLowerCase() }
              : { username: login },
          });

          if (!user || !user.isActive) return null;

          const isMatch = await bcrypt.compare(password, user.password);

          if (isMatch) {
            return {
              id: user.id,
              email: user.email || undefined,
              name: user.nameEn ? `${user.nameEn} (${user.nameZh})` : user.nameZh,
              role: user.role,
            };
          }
          return null;
        } catch (e) {
          console.error("[auth] authorize failed:", e);
          throw e;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
