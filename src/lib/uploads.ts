import { writeFile, mkdir, stat } from "node:fs/promises";
import { join, resolve, normalize } from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadValidationError = {
  reason: "type" | "size" | "empty";
  message: string;
};

export function validateUpload(
  file: File
): UploadValidationError | null {
  if (file.size === 0) {
    return { reason: "empty", message: "Archivo vacío." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      reason: "type",
      message: `Tipo no soportado: ${file.type || "desconocido"}. Usá JPG, PNG o WEBP.`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { reason: "size", message: "Imagen mayor a 5MB." };
  }
  return null;
}

/** Persiste un archivo en UPLOAD_DIR y devuelve la URL pública. */
export async function saveUpload(file: File): Promise<{ url: string }> {
  await ensureUploadDir();
  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;
  const path = join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path, buffer);
  return { url: `/uploads/${filename}` };
}

async function ensureUploadDir() {
  try {
    await stat(UPLOAD_DIR);
  } catch {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/** Resuelve un filename a un path absoluto verificando que esté dentro
 *  de UPLOAD_DIR (anti path-traversal). Devuelve null si no es válido. */
export function resolveUploadPath(filename: string): string | null {
  const safeBase = resolve(UPLOAD_DIR);
  const candidate = resolve(join(UPLOAD_DIR, normalize(filename)));
  if (!candidate.startsWith(safeBase + "/") && candidate !== safeBase) {
    return null;
  }
  // Disallow nested paths — solo el filename plano.
  if (filename.includes("/") || filename.includes("\\")) return null;
  return candidate;
}

export function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
