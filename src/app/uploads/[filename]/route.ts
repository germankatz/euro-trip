import { NextRequest } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { resolveUploadPath, contentTypeForFilename } from "@/lib/uploads";

export const runtime = "nodejs";

// Sin auth (el proxy/middleware excluye /uploads). Las URLs son UUIDs
// random así que efectivamente no-guesseables. El path-traversal está
// bloqueado por resolveUploadPath.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const path = resolveUploadPath(filename);
  if (!path) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const info = await stat(path);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const data = await readFile(path);
    return new Response(data, {
      headers: {
        "Content-Type": contentTypeForFilename(filename),
        "Content-Length": String(info.size),
        // Cache por 30 días en el browser. Como los nombres son UUIDs
        // únicos, no hay riesgo de stale.
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
