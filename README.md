# euro-trip

## Resumen

Webapp de itinerario colaborativo: hay un "tronco" compartido de ciudades que ve todo el grupo, y los subgrupos pueden agregar tramos propios antes o después del tronco (ej. "yo me quedo dos días más en Berlín"). Es single-tenant: cada instancia maneja un único Trip global. Pensado para ~300 visitas/mes, sin pretensión de escalar.

Stack: Next.js 16 (App Router) + React 19 + TypeScript, Postgres 16 con Prisma 7 (driver adapter `@prisma/adapter-pg`), Auth.js v5 (Credentials + bcrypt, JWT sessions), Mapbox GL JS para el mapa y geocoding via Nominatim (proxy server-side), Tailwind v4 + shadcn/ui (base-ui por debajo), framer-motion, `@uiw/react-md-editor`, react-hook-form + zod. Uploads locales en `/data/uploads` (volume Docker, `./uploads` en dev). Deploy con Docker + docker-compose, target Dokploy en VPS.

## Setup local

1. `npm install` — instala todo. El `postinstall` corre `prisma generate` automáticamente, así que el client queda listo.
2. `cp .env.example .env` y editá. Nota: el repo ya trae un `.env` apuntando a `localhost:5433` (Postgres dockerizado) para que el dev arranque sin pelearse con la config. Si el `.env` ya está, podés saltearte este paso.
3. `npm run db:up` — levanta Postgres 16 en docker. El puerto del container (5432) está mapeado al 5433 del host para no chocar con un Postgres local.
4. `npm run db:migrate` — corre las migraciones de Prisma.
5. `npm run db:seed` — crea el seed user y el Trip único a partir de las env vars.
6. (Opcional) `cp prisma/cities.seed.example.json prisma/cities.seed.json`, editalo con las ciudades de tu itinerario, y volvé a correr `npm run db:seed`. Es idempotente, no duplica.
7. `npm run dev` — Next dev server en `http://localhost:3000`.

## Scripts disponibles

- `npm run dev` — Next dev server (Turbopack por default en Next 16).
- `npm run build` — build de producción.
- `npm run start` — corre el build (`next start`).
- `npm run lint` — eslint con la config de `eslint-config-next`.
- `npm run db:up` — `docker compose up -d db` (solo el servicio `db`).
- `npm run db:down` — `docker compose down` (baja todo el stack).
- `npm run db:migrate` — `prisma migrate dev` (crea migraciones en dev).
- `npm run db:migrate:deploy` — `prisma migrate deploy` (aplica migraciones existentes, para prod).
- `npm run db:reset` — `prisma migrate reset`. Borra todo y re-corre seed. Cuidado.
- `npm run db:seed` — corre `prisma/seed.ts` via `tsx`.
- `npm run db:studio` — abre Prisma Studio.

## Variables de entorno

Todas viven en `.env` (gitignoreado). El template canónico es `.env.example`.

| Var | Para qué | Ejemplo | Requerida | Notas |
|---|---|---|---|---|
| `DATABASE_URL` | Connection string de Postgres usado por Prisma. | `postgresql://postgres:postgres@localhost:5433/eurotrip?schema=public` (dev) / `postgresql://postgres:postgres@db:5432/eurotrip?schema=public` (compose) | sí | El host cambia: `localhost:5433` cuando corrés Next en el host contra el Postgres dockerizado, `db:5432` cuando todo corre dentro del compose. |
| `POSTGRES_USER` | User del container de Postgres. | `postgres` | sí (en compose) | Lo consume el servicio `db`. Solo se usa en docker-compose. |
| `POSTGRES_PASSWORD` | Password del container. | `postgres` | sí (en compose) | Cambialo en prod. |
| `POSTGRES_DB` | Nombre de la DB que crea el container al iniciarse. | `eurotrip` | sí (en compose) | Tiene que matchear con la DB del `DATABASE_URL`. |
| `NEXTAUTH_SECRET` | Secret para firmar JWTs de Auth.js. | (output de `openssl rand -base64 32`) | sí | Generalo con `openssl rand -base64 32`. En prod usá uno distinto al de dev. |
| `NEXTAUTH_URL` | URL pública de la app, usada por Auth.js para callbacks. | `http://localhost:3000` (dev) / `https://tu-dominio.com` (prod) | sí | En prod cambia al dominio público. |
| `SEED_USER_EMAIL` | Email del user inicial creado por el seed. | `admin@example.com` | sí (para seed) | Idempotente: si ya existe, no lo duplica. |
| `SEED_USER_PASSWORD` | Password en plano del seed user. Se hashea con bcrypt al guardarse. | `changeme` | sí (para seed) | Cambialo en prod antes del primer seed. |
| `SEED_TRIP_NAME` | Nombre del Trip único que se crea si no existe. | `Mi viaje` | no (default `Mi viaje`) | Solo se usa la primera vez. |
| `UPLOAD_DIR` | Path donde se escriben las imágenes uploadeadas. | `./uploads` (dev) / `/data/uploads` (Docker) | sí | En el container es el mountpoint del volume `uploads_data`. En dev local apuntá a un dir relativo. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token público de Mapbox GL JS. Expuesto al cliente. | `pk.eyJ1...` | sí | Conseguilo en https://account.mapbox.com/access-tokens/. Tier gratis: 50k loads/mes. Sin token la app muestra un placeholder en lugar del mapa. |

## Seed script

El seed (`prisma/seed.ts`, corrido vía `tsx` por la config `prisma.seed` de `package.json`) hace tres cosas:

1. **Seed user**: upsert por `email` usando `SEED_USER_EMAIL` y `SEED_USER_PASSWORD`. La password se hashea con bcrypt (cost 12). Si el user ya existe no lo toca. También crea el `TripMember` correspondiente.
2. **Trip único**: busca el primer Trip por `createdAt asc`. Si no hay ninguno, crea uno con `name = SEED_TRIP_NAME`. Si ya existe lo reusa (single-tenant: un solo Trip por instancia).
3. **Cities** (opcional): si existe `prisma/cities.seed.json`, valida cada entry con zod y las crea como `visibility: "shared"`. Idempotente por `(tripId, name)` — entries que ya existen se saltean. El `order` se calcula a partir del count actual de cities shared para no romper el orden.

Formato de `prisma/cities.seed.json` (array):

```json
[
  { "name": "Berlin", "lat": 52.52, "lng": 13.405, "countryCode": "DE" },
  { "name": "Madrid", "lat": 40.4168, "lng": -3.7038, "countryCode": "ES" }
]
```

`prisma/cities.seed.json` está gitignoreado a propósito — cada deploy/instancia tiene su propio itinerario. `prisma/cities.seed.example.json` está commiteado como referencia.

Para conseguir lat/lng rápido: click derecho en Google Maps sobre el lugar y "copiar coordenadas". Alternativa CLI:

```
curl 'https://nominatim.openstreetmap.org/search?format=json&q=Berlin'
```

El seed carga `dotenv/config` al inicio del archivo, así que las env vars del `.env` se levantan aunque corras el script directamente con `tsx` fuera de Next.

## Deploy en Dokploy

1. En Dokploy, creá una nueva aplicación tipo **Docker Compose**.
2. Conectá el repo Git (branch que quieras deployar).
3. Configurá las env vars en Dokploy. Todas las del `.env.example`, con estos cambios respecto a dev:
   - `DATABASE_URL=postgresql://postgres:postgres@db:5432/eurotrip?schema=public` — el host es `db` (el nombre del servicio en `docker-compose.yml`), no `localhost`. El puerto interno es 5432, no 5433 (el 5433 es solo el mapping al host).
   - `NEXTAUTH_URL` apuntando al dominio público (ej. `https://eurotrip.tu-dominio.com`).
   - `NEXTAUTH_SECRET` generado nuevo con `openssl rand -base64 32`.
   - `POSTGRES_PASSWORD` y `SEED_USER_PASSWORD` con valores reales, no los defaults.
   - `UPLOAD_DIR=/data/uploads` (matchea con el mount del volume `uploads_data`).
4. Deploy.
5. Después del primer deploy, abrí una shell en el contenedor `app` desde Dokploy y corré:
   ```
   npx prisma migrate deploy && npm run db:seed
   ```
6. (Opcional, recomendado) configurá un **post-deploy hook** en Dokploy con `npx prisma migrate deploy` para que cada release aplique migraciones nuevas automáticamente. El seed no hace falta correrlo en cada deploy — es idempotente pero es ruido.

Los volumes `uploads_data` (imágenes) y `pg_data` (DB) están definidos en `docker-compose.yml` y Dokploy los persiste automáticamente entre deploys. No los toques a mano salvo backup/restore.

El healthcheck del servicio `app` espera un `2xx` en `/api/health` (el endpoint ya existe en `src/app/api/health/route.ts` y devuelve `{ ok: true }` sin tocar la DB).

## Estructura del repo

```
prisma/
  schema.prisma                  # User, Trip, TripMember, City, etc.
  seed.ts                        # Seed user + trip + cities
  cities.seed.example.json       # Referencia, commiteada
  cities.seed.json               # Real, gitignoreada
  migrations/                    # Migraciones generadas por prisma migrate
src/
  app/                           # App Router: pages + API routes
    api/                         # Route handlers
    login/                       # /login
    register/                    # /register
    layout.tsx
    page.tsx
  auth.ts                        # Auth.js v5: config completa con Prisma adapter
  auth.config.ts                 # Config edge-safe (sin DB), para el proxy
  proxy.ts                       # Middleware (Next 16 lo renombra a "proxy")
  components/ui/                 # shadcn components
  lib/
    prisma.ts                    # PrismaClient singleton con adapter-pg
    auth-actions.ts              # Server actions: login / register / logout
    utils.ts                     # cn() y helpers
  generated/prisma/              # Cliente generado por Prisma (gitignoreado)
  types/
    next-auth.d.ts               # Type augmentation de la session
Dockerfile
docker-compose.yml
.env.example
.env                             # Local, gitignoreado (pero ya en el repo? ver .gitignore)
prisma.config.ts
```

Nota sobre el `proxy.ts`: en Next 16 el `middleware.ts` está deprecado y el export tiene que llamarse `proxy`. Si después de un pull aparece un error sobre middleware, revisá que no haya quedado un `middleware.ts` viejo dando vueltas.

## Troubleshooting

**"El seed pide DATABASE_URL pero ya está en .env"**
El seed corre con `tsx` y carga `import "dotenv/config"` en la primera línea, así que el `.env` del cwd se levanta automáticamente. Si seguís viendo el error, asegurate de estar corriendo el comando desde la raíz del repo (no desde `prisma/`).

**"Puerto 5433 ocupado"**
Algún Postgres local está en el medio. Dos opciones:
- Editá el mapping en `docker-compose.yml` (`"5433:5432"` → `"5434:5432"`) y actualizá `DATABASE_URL` en `.env` para que apunte al puerto nuevo.
- O directamente parar tu Postgres local (`brew services stop postgresql` en Mac).

**"Prisma client no encuentra el adapter" / "Cannot find module '@prisma/adapter-pg'"**
Corré `npx prisma generate`. Normalmente lo hace el `postinstall`, pero si modificaste el schema o borraste `src/generated/prisma/`, hay que regenerar.

**"Error: middleware deprecated" en Next 16**
Ya está migrado: el middleware vive en `src/proxy.ts` y exporta `proxy`. Si el error sigue después de un pull, fijate que no haya quedado un `src/middleware.ts` o `middleware.ts` en la raíz de un commit anterior.

**"Quiero resetear todo localmente"**
`npm run db:reset` — drops la DB, re-aplica todas las migraciones, y corre el seed de nuevo. Borra todos los datos. Útil después de joder con el schema.

**"`npm run db:seed` no carga las cities"**
El archivo `prisma/cities.seed.json` no existe (no está en el repo). Copialo desde `prisma/cities.seed.example.json` y editalo. El seed loggea `ℹ cities.seed.json no existe, salteando carga de ciudades` si no lo encuentra.

**"Auth.js da error sobre NEXTAUTH_SECRET"**
La var no está seteada o vale el default `changeme-...`. Generá uno con `openssl rand -base64 32` y pegalo en `.env` (o en las env vars de Dokploy).

## Próximos pasos / estado

Esta versión tiene completados:
- Schema de Prisma con modelos base.
- Auth.js v5 con Credentials provider + bcrypt + JWT.
- Seed script idempotente (user + trip + cities).
- Docker / docker-compose listo para Dokploy.

Falta (en algún orden razonable, ver el spec original para detalle):
- Mapa fullscreen con Mapbox GL JS (necesita `NEXT_PUBLIC_MAPBOX_TOKEN`).
- Bottom card draggable (framer-motion).
- CRUD de cities, transports, activities.
- Sistema de invitations.
- Markdown editor en notas (ya tenemos `@uiw/react-md-editor` en deps).
- Image upload (escribiendo a `UPLOAD_DIR`).
- Vista de archived / pasados.
