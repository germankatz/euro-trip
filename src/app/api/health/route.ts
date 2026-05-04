// Healthcheck endpoint usado por docker-compose. No queremos que dependa
// de la DB para no marcar al app como unhealthy si Postgres se reinicia
// momentáneamente (Docker ya tiene su propio healthcheck para `db`).
export async function GET() {
  return Response.json({ ok: true });
}
