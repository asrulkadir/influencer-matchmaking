import { type NextAuthOptions, getServerSession } from "next-auth";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "./db";
import type { UserRole } from "./database.types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

/**
 * Custom NextAuth adapter using Supabase.
 */
function SupabaseAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const { data, error } = await supabase
        .from("User")
        .insert({
          email: user.email,
          name: user.name ?? null,
          emailVerified: user.emailVerified?.toISOString() ?? null,
          image: user.image ?? null,
          role: "BRAND",
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, emailVerified: data.emailVerified ? new Date(data.emailVerified) : null } as AdapterUser;
    },
    async getUser(id) {
      const { data } = await supabase.from("User").select().eq("id", id).single();
      if (!data) return null;
      return { ...data, emailVerified: data.emailVerified ? new Date(data.emailVerified) : null } as AdapterUser;
    },
    async getUserByEmail(email) {
      const { data } = await supabase.from("User").select().eq("email", email).single();
      if (!data) return null;
      return { ...data, emailVerified: data.emailVerified ? new Date(data.emailVerified) : null } as AdapterUser;
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const { data: account } = await supabase
        .from("Account")
        .select("userId")
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single();
      if (!account) return null;
      const { data } = await supabase.from("User").select().eq("id", account.userId).single();
      if (!data) return null;
      return { ...data, emailVerified: data.emailVerified ? new Date(data.emailVerified) : null } as AdapterUser;
    },
    async updateUser(user) {
      const { data, error } = await supabase
        .from("User")
        .update({
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          emailVerified: user.emailVerified?.toISOString() ?? undefined,
          image: user.image ?? undefined,
        })
        .eq("id", user.id!)
        .select()
        .single();
      if (error) throw error;
      return { ...data, emailVerified: data.emailVerified ? new Date(data.emailVerified) : null } as AdapterUser;
    },
    async linkAccount(account: AdapterAccount) {
      await supabase.from("Account").insert({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token ?? null,
        access_token: account.access_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: account.session_state as string ?? null,
      });
    },
    async createSession(session) {
      const { data, error } = await supabase
        .from("Session")
        .insert({
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, expires: new Date(data.expires) } as AdapterSession;
    },
    async getSessionAndUser(sessionToken) {
      const { data: session } = await supabase
        .from("Session")
        .select()
        .eq("sessionToken", sessionToken)
        .single();
      if (!session) return null;
      const { data: user } = await supabase.from("User").select().eq("id", session.userId).single();
      if (!user) return null;
      return {
        session: { ...session, expires: new Date(session.expires) } as AdapterSession,
        user: { ...user, emailVerified: user.emailVerified ? new Date(user.emailVerified) : null } as AdapterUser,
      };
    },
    async updateSession(session) {
      const { data } = await supabase
        .from("Session")
        .update({
          expires: session.expires?.toISOString(),
        })
        .eq("sessionToken", session.sessionToken)
        .select()
        .single();
      if (!data) return null;
      return { ...data, expires: new Date(data.expires) } as AdapterSession;
    },
    async deleteSession(sessionToken) {
      await supabase.from("Session").delete().eq("sessionToken", sessionToken);
    },
    async deleteUser(userId) {
      await supabase.from("User").delete().eq("id", userId);
    },
    async unlinkAccount({ providerAccountId, provider }: Pick<AdapterAccount, "provider" | "providerAccountId">) {
      await supabase
        .from("Account")
        .delete()
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId);
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    newUser: "/onboarding",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (trigger === "update") {
        const { data } = await supabase
          .from("User")
          .select("role")
          .eq("id", token.id)
          .single();
        if (data) {
          token.role = data.role as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const { data: user } = await supabase
    .from("User")
    .select("*, brandProfile:BrandProfile(*), creatorProfile:CreatorProfile(*)")
    .eq("id", session.user.id)
    .single();

  return user;
}

/**
 * Role-based access control helper.
 * Throws if user doesn't have the required role.
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("Unauthorized: No active session");
  }

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(", ")}] role`
    );
  }

  return session.user;
}
