# TODO

Lista de cosas pendientes respecto a la spec original y mejoras claras.
Marcá las que vayas haciendo. Lo que está sin marcar es lo que falta.

## Gaps de la spec

- [ ] **Mostrar autor en cada item** — la spec dice "Todo registro lleva
      `createdById` y se muestra en la UI ('creado por X')". Hoy solo se
      muestra `Creado: <fecha>` en TransportDetail / ActivityDetail.
      Hay que joinear `User.name` en las queries de
      `getVisibleTransports` / `getVisibleActivities` / `getVisibleCities`
      y renderizarlo en los detalles.
- [ ] **Cambiar contraseña** — el dropdown del avatar tiene "Perfil" y
      "Cambiar contraseña" como ítems disabled. La spec original mencionaba
      "forzar cambio en primer login del seed"; al menos un flow básico de
      cambio (server action + dialog) debería existir.
- [ ] **Página de perfil** — disabled en el dropdown. Mínimo: ver email +
      nombre + cambiar nombre.
- [ ] **Timeline general de transports free-floating** — la spec dice
      textual: "el transporte aparece igual en el timeline general pero no
      en ninguna vista de detalle de City" cuando ambas FKs son `null`.
      Hoy estos transports quedan invisibles en la UI.

## UX que la spec no pide pero queda flojo

- [ ] **Lista de members de una group city** — para saber con quién
      compartís. El share dialog muestra invitaciones (links generados),
      no la lista actual de `CityMember`.
- [ ] **Remover un CityMember o un TripMember** — una vez sumado, no hay
      forma de sacarlo. Solo se puede revocar invitaciones todavía no
      aceptadas.
- [ ] **Cleanup de imágenes huérfanas** — al hard-delete de una activity
      o transport con imágenes, los archivos en `UPLOAD_DIR` quedan ahí
      para siempre. Idealmente se borran del filesystem dentro de la
      transacción de delete, o se hace via cron.
- [ ] **Toasts de feedback con `sonner`** — ya está instalado, no se usa.
      Acciones exitosas son silenciosas. Un `toast.success("Ciudad creada")`
      en cada create/edit/archive mejora mucho la sensación.
- [ ] **Imágenes inline en markdown** — actualmente las imágenes van solo
      en el bloque ImageUploader separado. Si pegás `![](url)` se renderiza,
      pero no hay flujo de "subir imagen desde dentro del editor".
- [ ] **Healthcheck con DB check** — `/api/health` devuelve `{ok:true}`
      sin probar Postgres. Si la DB se cae, el container queda "healthy".
      Cambiar a un `SELECT 1` con timeout corto.

## Mejoras / robustez

- [ ] **Edit de City permite cambiar visibility** — actualmente solo se
      puede cambiar nombre y countryCode. Cambiar `shared ↔ group` requiere
      eliminar y recrear, lo cual es tedioso si tenés activities cargadas.
- [ ] **UI para `expiresAt` de invitations** — el backend lo honra, no hay
      forma de setearlo al crear el link.
- [ ] **Race condition en reorder shared** — si dos seeds reordenan al
      mismo tiempo, "el último gana" sin merge. Para 300 visits/mes no
      importa, pero técnicamente corresponde un version field o un lock.
- [ ] **Seed de ejemplo de transports/activities** — el seed solo crea
      cities. Si querés un trip de demo full-poblado, hay que cargarlo a
      mano. Agregar `prisma/transports.seed.example.json` y
      `prisma/activities.seed.example.json` y extender `prisma/seed.ts`.

## Descartadas explícitamente

(no hacer salvo cambio de criterio)

- ~~Tests automatizados~~ — la spec dice no son requeridos.
- ~~UI de selección multi-trip~~ — single-tenant intencional.
- ~~Forzar cambio de password en primer login~~ — alcanza con que se pueda
  cambiar en algún momento.
- ~~i18n~~ — solo español está bien para este proyecto.

## Recomendación de orden si vas a cerrar lo más alto-impacto

Las 4 más visibles para un usuario real, en orden de menor a mayor esfuerzo:

1. **Toasts** — casi gratis con sonner ya instalado.
2. **Mostrar autor** — cambio en 3 queries + 4 lugares de render.
3. **Cambio de contraseña** — server action + dialog + wire al dropdown.
4. **Lista de members en group cities** — query + sección en el share dialog.

Una sola fase para esos cuatro, ~1-2 commits, cierra los gaps más
visibles de la spec.
