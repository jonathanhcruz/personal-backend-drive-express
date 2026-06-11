# Tasks — Feature: Folders

## Pendiente

### Fase 1 — Base de datos
- [ ] Migración: tabla `folders` con `id`, `name`, `parent_id`, `owner_id`, `timestamps`
- [ ] Seed: carpeta raíz del usuario admin en BD
- [ ] Crear directorio raíz en disco `{STORAGE_PATH}/{userId}/`

### Fase 2 — Endpoints CRUD
- [ ] `FoldersRepository` — `findById`, `findRootByOwner`, `findChildren`, `create`, `rename`, `delete`
- [ ] `FoldersService` — lógica de negocio + validación de ownership
- [ ] `FoldersController` — validación zod, contrato `{ data }` / `{ error }`
- [ ] `GET /api/folders/` — listar raíz
- [ ] `GET /api/folders/:id` — contenido de carpeta
- [ ] `POST /api/folders/` — crear carpeta
- [ ] `PATCH /api/folders/:id` — renombrar
- [ ] `DELETE /api/folders/:id` — eliminar (con flag `?recursive`)
- [ ] Proteger todas las rutas con auth middleware

### Fase 3 — Vincular archivos
- [ ] Coordinado con feature `files` Fase 1
- [ ] Upload acepta `folderId` opcional
- [ ] Validar ownership del folder destino en upload

### Fase 4 — Breadcrumb
- [ ] `GET /api/folders/:id/breadcrumb` — CTE recursiva en PostgreSQL
- [ ] `FoldersRepository.getBreadcrumb(id)`

## Completado
_Nada completado aún._

---
_Actualizar al iniciar o terminar cada tarea._
