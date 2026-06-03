# Tasks — Backend Drive

## En progreso
_Nada en progreso actualmente._

## Siguiente
- [ ] Resolver error 500 en `POST /api/files/upload` (debug en curso)
- [ ] Fase 3: Base de datos — conexión pg, schema `files`, `FilesRepository`

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

---
_Actualizar al iniciar o terminar cualquier tarea._
