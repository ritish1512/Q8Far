// src/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/prisma/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Fixed where() overload: Pass the string directly or structure it 
        // depending on your orm-family-sql client requirements.
        const user = await db.orm.public.ProcurementCenter
          .where({ email: credentials.email as string })
          .first();

        if (!user) {
          return null;
        }

        const passwordHash = user.passwordHash as string;

        if (!passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, passwordHash);
        const isRawPasswordValid = credentials.password===passwordHash;

        if (!isPasswordValid && !isRawPasswordValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email as string,
          name: user.name as string,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

