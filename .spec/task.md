# Tasks — Backend Drive

## En progreso
_Nada en progreso actualmente._

## Siguiente
- [ ] `shared/middlewares/auth.middleware.ts` — implementar verificación JWT real
- [ ] Proteger rutas de files y folders con auth middleware
- [ ] Fase 6: Módulo folders

## Completado
- [x] Configurar ESLint + Prettier
- [x] Configurar TypeScript (strict, src→dist)
- [x] Scripts de desarrollo con hot reload (`npm run dev`)
- [x] `src/index.ts` con Express base y routers montados bajo `/api`
- [x] Crear `.spec/` con contexto, spec, plan y tasks
- [x] Fase 1: Scaffolding — estructura hexagonal completa (37 archivos, 5 módulos)
- [x] Fase 2 parcial: `AppError` + errores HTTP tipados + error middleware + middlewares stub
- [x] `config/multer.ts` — diskStorage a `/mnt/jonathan/test`, nombre original, límite por ENV
- [x] `StorageAdapter` — checksum SHA-256 streaming, remove
- [x] `FilesService.upload` — checksum + FileRecord sin BD, cleanup en error
- [x] `FilesController.upload` + `FilesRepository` (interfaz)
- [x] Upload funcional — archivos guardados en `/mnt/jonathan/test`
- [x] Fase 3 parcial: `config/database.ts` — `pg.Pool` conectado a Docker PostgreSQL
- [x] Tabla `users` creada en BD (email, password_hash, role, is_active, refresh_token_hash)
- [x] Paquetes instalados: `pg`, `bcrypt`, `jsonwebtoken`, `zod`, `node-pg-migrate`
- [x] `.env` con credenciales de BD (ignorado en git)
- [x] `.env.example` con estructura sin credenciales
- [x] Fase 4: Módulo auth completo — login, refresh (rotación), logout con feedback
- [x] `UsersRepository` — findByEmail, findById, create, setRefreshToken con bcrypt (12 rounds)
- [x] `JwtAdapter` — signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken
- [x] `AuthService` — login con bcrypt.compare, refresh con rotación de hash, logout con validación
- [x] `AuthController` — validación zod, respuestas con contrato `{ data }` / `{ error }`
- [x] Rutas de users comentadas — usuario único gestionado directamente en BD

---
_Actualizar al iniciar o terminar cualquier tarea._
