import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    // Google SSO — primary login method for all users
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    // Credentials — kept for admin/superadmin login only
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) throw new Error("Invalid credentials");

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) throw new Error("Invalid credentials");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-ins: auto-create or find the user in DB
      if (account?.provider === "google") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (existingUser) {
            // Update profile picture if changed
            if (user.image && user.image !== existingUser.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { image: user.image, name: user.name || existingUser.name },
              });
            }
          } else {
            // Auto-register new Google users — no approval needed
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || "User",
                image: user.image || null,
                provider: "google",
                role: "USER",
                status: "APPROVED",
              },
            });
          }
        } catch (err: any) {
          console.error("Google signIn callback error:", err);
          require("fs").writeFileSync("auth-error.log", err?.toString() + "\n" + err?.stack);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      // On initial sign-in, look up DB user to get id/role/status
      if (account) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.picture = dbUser.image;
        }
      }
      // Initial sign-in from credentials
      if (user && !account) {
        token.id = user.id;
        token.role = (user as any).role;
        token.status = (user as any).status;
      }
      // Allow manual session update (after admin approves user)
      if (trigger === "update" && session?.status) {
        token.status = session.status;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
