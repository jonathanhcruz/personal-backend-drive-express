# Tasks — Backend Drive

## En progreso
_Nada en progreso._

## Pendiente

### Fase 8 — Audit log
- [ ] Migración: tabla `audit_logs`
- [ ] `AuditRepository` — insert, findAll con filtros y paginación
- [ ] `AuditService` — métodos `logUpload`, `logDownload`, `logDelete`, `logLogin`, `logShare`
- [ ] Integrar en `FilesService`, `FoldersService`, `AuthService`
- [ ] `GET /api/audit/` — solo admin, paginado

### Fase 9 — Permisos entre usuarios (scope por definir)
- [ ] Definir casos de uso reales antes de diseñar la solución
- [ ] Decidir si compartir da acceso de solo lectura o también escritura/borrado

---

## Completado

### Infraestructura
- [x] ESLint + Prettier configurados
- [x] TypeScript strict + `isolatedModules: true`
- [x] Scripts de desarrollo con hot reload (`npm run dev`)
- [x] `src/index.ts` con Express, routers montados bajo `/api`
- [x] `.spec/` con contexto, spec, plan y tasks
- [x] Estructura hexagonal completa (scaffolding)
- [x] `config/database.ts` — `pg.Pool` a Docker PostgreSQL
- [x] `node-pg-migrate` + scripts `migrate:up / :down / :create`
- [x] `config/multer.ts` — diskStorage, límite ENV, fileFilter mime

### Shared
- [x] `AppError` + errores HTTP tipados (`NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`, `ConflictError`)
- [x] `shared/constants/error-codes.ts` — `ErrorCode` + `TErrorCode`
- [x] `error.middleware.ts` — captura `AppError`, `MulterError`, catch-all 500
- [x] `auth.middleware.ts` — verifica JWT, inyecta `req.user`

### Auth
- [x] `JwtAdapter` — signAccessToken (15m), signRefreshToken (7d), verify
- [x] `UsersRepository` — findByEmail, findById, setRefreshToken
- [x] `AuthService` — login (bcrypt 12), refresh (rotación + hash SHA-256), logout (revocación)
- [x] `AuthController` — zod, contrato `{ data }` / `{ error }`
- [x] `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- [x] Usuario admin creado en BD directamente (sin endpoint de registro)

### Folders
- [x] Migración: tabla `folders` (`parent_id ON DELETE CASCADE`)
- [x] `FoldersRepository` — findById, findRootByOwner, findChildrenWithFiles, getBreadcrumb (CTE), create, rename, delete
- [x] `FoldersService` — ownership check, delete recursivo con limpieza de disco
- [x] `FoldersController` — zod, auth en todas las rutas
- [x] `GET /api/folders/` — listar raíz
- [x] `GET /api/folders/:id` — contenido (subcarpetas + archivos)
- [x] `GET /api/folders/:id/breadcrumb` — CTE recursiva
- [x] `POST /api/folders/` — crear
- [x] `PATCH /api/folders/:id` — renombrar
- [x] `DELETE /api/folders/:id` — eliminar (con `?recursive=true`) → `204`

### Files
- [x] Migración: tabla `files` (`folder_id`, `uploaded_by`, `checksum`, `storage_path`)
- [x] `StorageAdapter` — checksum SHA-256, remove, stream (ReadStream con Range)
- [x] `FilesRepository` — findById, findByFolder, findByNameAndFolder, create, hardDelete
- [x] `FilesService` — upload (disk-first + rollback), getById, listByFolder, stream, remove
- [x] `FilesController` — zod, `parseUuid` con label, auth en todas las rutas
- [x] `POST /api/files/upload?folderId=<uuid>` → `201`
- [x] `GET /api/files/?folderId=<uuid>` — listar por carpeta
- [x] `GET /api/files/:id` — metadata (sin storagePath)
- [x] `GET /api/files/:id/download` — streaming con Range support (HTTP 206) → `200/206`
- [x] `DELETE /api/files/:id` — hard delete disco + BD → `204`
- [x] Detección de duplicados (nombre + folder) → `409 CONFLICT`

### Share Tokens
- [x] Migración: tabla `file_share_tokens`
- [x] `ShareTokensRepository` — create, findById, markUsed, findActiveByFileId, delete
- [x] `FilesService` — createShareToken, redeemToken (1-uso + 8h), listShareTokens, revokeShareToken
- [x] `POST /api/files/:id/share` — crear token → `201 { data: { token, expiresAt } }`
- [x] `GET /api/files/:id/share` — listar tokens activos → `{ data: [{ id, expiresAt, createdAt }] }`
- [x] `DELETE /api/files/share/:tokenId` — revocar → `204`
- [x] `src/modules/share/` — router público sin auth
- [x] `GET /api/share/:token` — descarga pública, 1-uso, streaming con Range

---
_Actualizar al iniciar o terminar cualquier tarea._
