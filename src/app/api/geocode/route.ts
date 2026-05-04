import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { geocode } from "@/lib/geocode";

// Proxy server-side a Nominatim. Razones:
//   1. Inyectar User-Agent identificable (requisito de Nominatim).
//   2. Centralizar cache + rate limit.
//   3. Mantener el dominio del cliente fuera de los logs de Nominatim.

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitRaw ?? "8", 10) || 8, 1), 15);

  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const results = await geocode(q, limit);
    return Response.json({ results });
  } catch (err) {
    console.error("[/api/geocode] error:", err);
    return Response.json({ error: "geocode_failed" }, { status: 502 });
  }
}
