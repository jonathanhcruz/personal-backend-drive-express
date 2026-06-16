# Plan — Backend Drive

## Fases de desarrollo

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Scaffolding | Estructura de carpetas y archivos base | ✅ Completado |
| 2 | Config y shared | Env, errores, middlewares base | ✅ Completado |
| 3 | Base de datos | Conexión pg, migraciones, schema inicial | ✅ Completado |
| 4 | Auth | Login, JWT, refresh token con rotación, logout | ✅ Completado |
| 5 | Users | Usuario único en BD, rutas desactivadas | ✅ Completado |
| 6 | Folders | CRUD carpetas con navegación jerárquica | ✅ Completado |
| 7 | Files | Upload, download (Range), delete, share tokens | ✅ Completado |
| 8 | Audit | Log de acciones: upload, download, delete, login | Pendiente |
| 9 | Permisos | Compartir acceso entre usuarios registrados | Pendiente (scope TBD) |
| 10 | Media | Streaming HLS, thumbnails de video | Futuro |

---

## Fase 1 — Scaffolding ✅

Estructura hexagonal completa:
```
src/
├── modules/
│   ├── auth/    {domain, infrastructure, http}
│   ├── users/   {domain, infrastructure, http}
│   ├── files/   {domain, infrastructure, http}
│   ├── folders/ {domain, infrastructure, http}
│   └── share/   {http}                         ← public download sin auth
├── shared/
│   ├── constants/  {error-codes.ts}
│   ├── middlewares/ {auth, error, rate-limit}
│   ├── errors/      {AppError, http.errors}
│   └── types/       {express.d.ts}
├── config/          {env, database, multer}
└── index.ts
```

---

## Fase 2 — Config y shared ✅

- `shared/errors/app.error.ts` — clase base `AppError`
- `shared/errors/http.errors.ts` — `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `ConflictError` — todos aceptan `code: TErrorCode` opcional
- `shared/constants/error-codes.ts` — `ErrorCode` objeto + tipo `TErrorCode`
- `shared/middlewares/error.middleware.ts` — captura `AppError` + `MulterError` + catch-all 500
- `shared/middlewares/auth.middleware.ts` — verifica JWT, inyecta `req.user`
- `config/multer.ts` — diskStorage, límite `MAX_FILE_SIZE_MB`, fileFilter por mime
- `config/env.ts` — variables de entorno cargadas

---

## Fase 3 — Base de datos ✅

- `config/database.ts` — `pg.Pool` conectado a Docker PostgreSQL
- `node-pg-migrate` para migraciones
- Tablas creadas:
  - `users` — email, password_hash, role, refresh_token_hash
  - `folders` — id, name, parent_id (cascada), owner_id
  - `files` — id, name, mime_type, size, checksum, storage_path, folder_id, uploaded_by, deleted_at
  - `file_share_tokens` — id, file_id, created_by, expires_at, used_at, created_at

---

## Fase 4 — Auth ✅

- `JwtAdapter` — sign/verify access token (15m) y refresh token (7d)
- `UsersRepository` — findByEmail, findById, setRefreshToken
- `AuthService` — login (bcrypt 12 rounds + SHA-256 hash), refresh (rotación), logout (revocación)
- `AuthController` — zod, contrato estándar
- Endpoints: `POST /api/auth/login`, `/refresh`, `/logout`

---

## Fase 5 — Users ✅

- Usuario admin creado directamente en BD via `INSERT` con hash bcrypt generado en terminal
- Rutas `/api/users` no expuestas
- `UsersRepository` activo solo para uso interno de auth

---

## Fase 6 — Folders ✅

- Tabla `folders` con `parent_id ON DELETE CASCADE`
- `FoldersRepository` — findById, findRootByOwner, findChildrenWithFiles, getBreadcrumb (CTE recursiva), create, rename, delete
- `FoldersService` — ownership check en todas las operaciones, lógica de delete recursivo
- `FoldersController` — zod, todos los endpoints protegidos con auth
- Breadcrumb: CTE `WITH RECURSIVE` en PostgreSQL
- Delete recursivo: borra disco primero (`storage.remove` por cada archivo), luego BD (CASCADE)
- Respuestas: `201` en create, `200` en rename/contents/breadcrumb, `204` en delete

---

## Fase 7 — Files + Share Tokens ✅

### Files
- Tabla `files` con `folder_id`, `uploaded_by`, `checksum` (SHA-256)
- Ruta en disco: `{STORAGE_PATH}/{userId}/{folderId}/{uuid}.{ext}`
- `FilesRepository` — findById, findByFolder, findByNameAndFolder, create, hardDelete
- `StorageAdapter` — checksum SHA-256 streaming, remove, stream (ReadStream con Range)
- `FilesService` — upload (disk-first + rollback), getById, listByFolder, stream, remove
- `FilesController`:
  - `POST /upload` — multer, `folderId` en query param
  - `GET /` — listByFolder con `?folderId`
  - `GET /:id` — metadata (sin storagePath)
  - `GET /:id/download` — Range requests (HTTP 206), streaming a disco
  - `DELETE /:id` — hard delete de disco + BD → `204`

### Share Tokens
- Tabla `file_share_tokens` — id, file_id, created_by, expires_at, used_at, created_at
- Un archivo puede tener múltiples tokens activos simultáneos
- Cada token es de **un solo uso** — se marca como usado en la primera descarga
- Tokens expiran automáticamente a las **8 horas** de creación
- `ShareTokensRepository` — create, findById, markUsed, findActiveByFileId, delete
- `FilesService` — createShareToken, redeemToken, listShareTokens, revokeShareToken
- Endpoints protegidos (auth): `POST /:id/share`, `GET /:id/share`, `DELETE /share/:tokenId`
- Endpoint público: `GET /api/share/:token` — router separado sin auth middleware
- Al revocar: elimina el token de BD (no soft-delete)
- `markUsed` se llama **antes** de iniciar el stream para prevenir race conditions

---

## Fase 8 — Audit (Pendiente)

### Objetivo
Registrar acciones importantes para trazabilidad.

### Tabla `audit_logs`
```sql
CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  action     TEXT NOT NULL,  -- 'upload' | 'download' | 'delete' | 'share' | 'login' | 'logout'
  resource_id UUID,
  resource_type TEXT,        -- 'file' | 'folder' | 'share_token'
  ip         TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Acciones a registrar
- Login / logout
- Upload de archivo
- Download (autenticado y por token público)
- Delete de archivo o carpeta
- Creación y revocación de share token

### Endpoint
- `GET /api/audit/` — solo admin, con filtros y paginación

---

## Decisiones técnicas

| Área | Decisión |
|------|----------|
| Arquitectura | Hexagonal: domain / infrastructure / http por módulo |
| Validación | `zod` en el borde HTTP, antes del dominio |
| BD | `pg.Pool` (driver nativo), sin ORM |
| Migraciones | `node-pg-migrate` |
| Storage | `multer diskStorage` — nombre `{uuid}.{ext}`, path `{userId}/{folderId}/` |
| Checksum | SHA-256 streaming al momento del upload |
| Streaming | Node.js `ReadStream` con `{ start, end }` para Range (HTTP 206) |
| Share tokens | 1-uso, 8h, quemado antes de iniciar stream |
| Errores | `TErrorCode` tipados en `error-codes.ts`, todos pasan por `errorMiddleware` |
| Respuestas | `{ data }` o `204` en éxito, `{ error: { code, message } }` en error |
| Strings i18n | `code` es estable — el frontend traduce; `message` es informativo para dev |
| Hashing passwords | `bcrypt` 12 rounds |
| JWT | Access 15m / Refresh 7d, hash SHA-256 del refresh almacenado en BD |
