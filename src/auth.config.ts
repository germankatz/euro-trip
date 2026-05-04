import type { NextAuthConfig } from "next-auth";

// Config edge-safe: no importa Prisma ni bcrypt. Esto se usa en middleware
// (que corre en edge). El Credentials provider con DB lookup vive en auth.ts.
export const authConfig = {
  // En producción detrás de Dokploy/Traefik el host del request difiere del
  // dominio público; sin trustHost Auth.js bloquea con UntrustedHost.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const publicRoutes = ["/login", "/register", "/api/auth", "/api/health"];
      const isInvite = path.startsWith("/invite/");
      const isPublic = publicRoutes.some((p) => path.startsWith(p)) || isInvite;

      if (isPublic) return true;
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
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
} satisfies NextAuthConfig;
