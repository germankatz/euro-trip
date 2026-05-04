import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { validateUpload, saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";

// Aceptamos múltiples archivos en una sola request via FormData con
// múltiples entradas "files". El cliente puede mandar una sola, también.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "form_parse_failed" }, { status: 400 });
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return Response.json({ error: "no_files" }, { status: 400 });
  }
  if (files.length > 10) {
    return Response.json({ error: "too_many_files" }, { status: 400 });
  }

  // Validamos todos antes de escribir nada (fail-fast).
  for (const f of files) {
    const err = validateUpload(f);
    if (err) {
      return Response.json(
        { error: "validation_failed", message: err.message, file: f.name },
        { status: 400 }
      );
    }
  }

  const urls: string[] = [];
  for (const f of files) {
    try {
      const { url } = await saveUpload(f);
      urls.push(url);
    } catch (err) {
      console.error("[/api/uploads] error guardando:", err);
      return Response.json(
        { error: "write_failed", uploaded: urls },
        { status: 500 }
      );
    }
  }

  return Response.json({ urls });
}
