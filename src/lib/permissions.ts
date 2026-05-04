// Reglas de permisos según la matriz de la spec:
//   - Seed: edita/desarchiva cualquier cosa, hard delete, todo.
//   - Creator: edita/archiva/desarchiva lo propio.
//   - Otros con acceso: solo archivan (acción colaborativa).

export type Actor = {
  userId: string;
  role: "seed" | "member";
  isTripMember: boolean;
};

export type RecordOwnership = {
  createdById: string;
  archivedAt: Date | null;
};

export function canCreate(actor: Actor): boolean {
  return actor.role === "seed" || actor.isTripMember;
}

export function canEdit(actor: Actor, record: RecordOwnership): boolean {
  if (actor.role === "seed") return true;
  return record.createdById === actor.userId;
}

export function canArchive(actor: Actor, record: RecordOwnership): boolean {
  if (record.archivedAt) return false;
  return actor.role === "seed" || actor.isTripMember;
}

export function canUnarchive(actor: Actor, record: RecordOwnership): boolean {
  if (!record.archivedAt) return false;
  if (actor.role === "seed") return true;
  return record.createdById === actor.userId;
}

export function canDelete(actor: Actor): boolean {
  return actor.role === "seed";
}
