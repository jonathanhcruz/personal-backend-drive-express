# Plan — Backend Drive

## Fases de desarrollo

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Scaffolding | Estructura de carpetas y archivos base | ✅ Completado |
| 2 | Config y shared | Env validation, errors, middlewares base | 🔄 Parcial |
| 3 | Base de datos | Conexión pg, migraciones, schema inicial | 🔄 Parcial |
| 4 | Módulo auth | Login, JWT, refresh token, logout | ✅ Completado |
| 5 | Módulo users | Usuario único en BD, rutas desactivadas | ✅ Completado |
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
- `shared/middlewares/auth.middleware.ts` — implementar verificación JWT real
- `shared/middlewares/rate-limit.middleware.ts` — implementar con `express-rate-limit`

---

## Fase 3 — Base de datos 🔄 Parcial

### Completado
- `config/database.ts` — `pg.Pool` conectado a Docker PostgreSQL (`drive-nest`)
- Tabla `users` creada con columnas: `id`, `email`, `password_hash`, `role`, `is_active`, `refresh_token_hash`, `created_at`, `updated_at`
- Paquetes instalados: `pg`, `@types/pg`, `bcrypt`, `@types/bcrypt`, `jsonwebtoken`, `@types/jsonwebtoken`, `zod`, `node-pg-migrate`
- Scripts: `migrate:up`, `migrate:down`, `migrate:create`
- Carpeta `migrations/` ignorada en git (pertenece a infra-drive)

### Pendiente
- Tabla `folders` — schema y migración (Fase 6)
- Tabla `files` — schema y migración (Fase 7)

---

## Fase 4 — Módulo auth ✅

### Implementado
- `JwtAdapter` — sign/verify access token (15m) y refresh token (7d)
- `UsersRepository` — `findByEmail` (con hash), `findById`, `setRefreshToken`
- `AuthService`:
  - `login` — bcrypt.compare (12 rounds) + emisión de token pair + almacena SHA-256 del refresh
  - `refresh` — verifica JWT + compara hash almacenado + rotación
  - `logout` — verifica JWT + compara hash + revoca (retorna `boolean` para feedback)
- `AuthController` — validación zod, contrato `{ data }` / `{ error }`
- Endpoints: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`

---

## Fase 5 — Módulo users ✅

### Decisión
- Un único usuario administrador creado directamente en la BD via `INSERT`
- Contraseña hasheada con bcrypt generada en terminal
- Rutas `GET/POST/PATCH/DELETE /api/users` comentadas (no expuestas)
- `UsersRepository` activo solo para uso interno del módulo auth

---

## Fase 6 — Módulo folders (siguiente)

### Objetivo
CRUD de carpetas con navegación jerárquica (carpetas anidadas).

### Pasos
1. Migración: tabla `folders`
2. Implementar `FoldersRepository`
3. Implementar `FoldersService`
4. Implementar `FoldersController` + rutas protegidas con auth

### Schema tabla `folders`
```sql
CREATE TABLE folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES folders(id) ON DELETE CASCADE,
  owner_id   UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Fase 7 — Módulo files completo (después de folders)

### Schema tabla `files`
```sql
CREATE TABLE files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size         BIGINT NOT NULL,
  checksum     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  folder_id    UUID REFERENCES folders(id) ON DELETE SET NULL,
  uploaded_by  UUID NOT NULL REFERENCES users(id),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Comportamiento de duplicados
- Mismo nombre + misma carpeta → `409 Conflict`
- Header `X-Replace: true` → soft-delete del anterior + upload nuevo

---

## Decisiones técnicas
- Validación de DTOs: `zod`
- Conexión BD: `pg` (driver nativo de PostgreSQL)
- Migraciones: `node-pg-migrate` (gestionadas en `infra-drive`, no en el backend)
- Hashing contraseñas: `bcrypt` (12 rounds)
- JWT: `jsonwebtoken`
- Refresh token: rotación en cada uso, hash SHA-256 almacenado en `users.refresh_token_hash`
- Seguridad HTTP: `helmet` (pendiente)
- Rate limiting: `express-rate-limit` (pendiente)
- Upload: `multer` con `diskStorage` (streaming a disco, sin buffer en memoria)
- Nombres en disco: nombre original del archivo
- Ruta de almacenamiento: `STORAGE_PATH` env var (default `/mnt/jonathan/test`)
- Usuario único: creado directamente en BD, sin endpoint de registro
