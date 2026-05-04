import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Next 16 espera un export `proxy` que sea una función. Auth.js v5 nos da
// el handler como `auth` — lo re-exportamos con el nombre que pide Next.
export const proxy = auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
