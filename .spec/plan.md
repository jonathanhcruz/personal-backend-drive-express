# Plan — Backend Drive

## Fases de desarrollo

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Scaffolding | Estructura de carpetas y archivos base | ✅ Completado |
| 2 | Config y shared | Env validation, errors, middlewares base | 🔄 Parcial |
| 3 | Base de datos | Conexión pg, migraciones, schema inicial | Pendiente |
| 4 | Módulo auth | Login, JWT, refresh token, logout | Pendiente |
| 5 | Módulo users | CRUD usuarios, roles, admin guard | Pendiente |
| 6 | Módulo folders | CRUD carpetas, navegación jerárquica | Pendiente |
| 7 | Módulo files | Upload funcional con BD, download, borrado lógico | Pendiente |
| 8 | Módulo audit | Log de acciones, IP, timestamp | Pendiente |
| 9 | Módulo sharing | Permisos granulares, links públicos | Pendiente |
| 10 | Módulo media | Streaming video/audio, thumbnails | Futuro |

---

## Fase 1 — Scaffolding ✅

Estructura hexagonal completa creada:
```
src/
├── modules/
│   ├── auth/   {domain, infrastructure, http}
│   ├── users/  {domain, infrastructure, http}
│   ├── files/  {domain, infrastructure, http}
│   ├── folders/{domain, infrastructure, http}
│   └── audit/  {domain, infrastructure, http}
├── shared/
│   ├── middlewares/ {auth, error, rate-limit}
│   ├── errors/      {AppError, http.errors}
│   └── types/       {express.d.ts, pagination}
├── config/          {env, database, multer}
└── index.ts
```

---

## Fase 2 — Config y shared 🔄 Parcial

### Completado
- `shared/errors/app.error.ts` — clase base `AppError`
- `shared/errors/http.errors.ts` — `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `ConflictError`
- `shared/middlewares/error.middleware.ts` — captura `AppError` + `MulterError` + catch-all
- `shared/middlewares/auth.middleware.ts` — stub (pasa a next, sin verificación)
- `shared/middlewares/rate-limit.middleware.ts` — stub
- `config/multer.ts` — diskStorage funcional, límite por ENV, fileFilter por mime
- `config/env.ts` — variables básicas sin validación zod aún

### Pendiente
- `config/env.ts` — validación con `zod` al arranque (falla fast si falta var)
- `shared/middlewares/auth.middleware.ts` — implementar verificación JWT real (Fase 4)
- `shared/middlewares/rate-limit.middleware.ts` — implementar con `express-rate-limit` (Fase 4)

---

## Fase 3 — Base de datos (siguiente)

### Objetivo
Conectar PostgreSQL e implementar el repositorio de archivos para persistir metadatos.

### Pasos
1. Instalar `pg` + `@types/pg`
2. Implementar `config/database.ts` — `pg.Pool` con `env.databaseUrl`
3. Crear migración inicial: tabla `files`
4. Implementar `FilesRepository` (implementación concreta de `IFilesRepository`)
5. Inyectar repositorio en `FilesService`
6. Validar: subir archivo → metadatos en BD → consultar

### Schema tabla `files`
```sql
CREATE TABLE files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size        BIGINT NOT NULL,
  checksum    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  folder_id   UUID REFERENCES folders(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Fase 7 — Módulo files completo (después de auth + folders)

### Comportamiento de duplicados
- Si se sube un archivo con el mismo nombre en la misma carpeta → `409 Conflict`
- Si la request incluye header `X-Replace: true` → soft-delete del anterior + upload nuevo
- "Mismo archivo" = mismo `name` + mismo `folder_id`

---

## Decisiones técnicas
- Validación de DTOs: `zod`
- Conexión BD: `pg` (driver nativo de PostgreSQL)
- Migraciones: `node-pg-migrate`
- Hashing: `bcrypt`
- JWT: `jsonwebtoken`
- Seguridad HTTP: `helmet`
- Rate limiting: `express-rate-limit`
- Upload: `multer` con `diskStorage` (streaming a disco, sin buffer en memoria)
- Nombres en disco: nombre original del archivo
- Ruta de almacenamiento: `STORAGE_PATH` env var (default `/mnt/jonathan/test`)
