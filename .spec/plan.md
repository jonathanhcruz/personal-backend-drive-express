# Plan — Backend Drive

## Fases de desarrollo

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Scaffolding | Estructura de carpetas y archivos base | En progreso |
| 2 | Config y shared | Env validation, errors, middlewares base | Pendiente |
| 3 | Base de datos | Conexión pg, migraciones, schema inicial | Pendiente |
| 4 | Módulo auth | Login, JWT, refresh token, logout | Pendiente |
| 5 | Módulo users | CRUD usuarios, roles, admin guard | Pendiente |
| 6 | Módulo folders | CRUD carpetas, navegación jerárquica | Pendiente |
| 7 | Módulo files | Upload, download, borrado lógico, checksums | Pendiente |
| 8 | Módulo audit | Log de acciones, IP, timestamp | Pendiente |
| 9 | Módulo sharing | Permisos granulares, links públicos | Pendiente |
| 10 | Módulo media | Streaming video/audio, thumbnails | Futuro |

---

## Fase 1 — Scaffolding detallado

### Objetivo
Crear la estructura de carpetas y los archivos base vacíos (con sus exports y tipos mínimos) para que el proyecto tenga forma desde el inicio y cada módulo sepa dónde va.

### Estructura final esperada
```
src/
├── modules/
│   ├── auth/
│   │   ├── domain/
│   │   │   ├── auth.service.ts
│   │   │   └── auth.types.ts
│   │   ├── infrastructure/
│   │   │   ├── jwt.adapter.ts
│   │   │   └── auth.repository.ts
│   │   └── http/
│   │       ├── auth.controller.ts
│   │       └── auth.routes.ts
│   ├── users/
│   │   ├── domain/
│   │   │   ├── users.service.ts
│   │   │   └── users.types.ts
│   │   ├── infrastructure/
│   │   │   └── users.repository.ts
│   │   └── http/
│   │       ├── users.controller.ts
│   │       └── users.routes.ts
│   ├── files/
│   │   ├── domain/
│   │   │   ├── files.service.ts
│   │   │   └── files.types.ts
│   │   ├── infrastructure/
│   │   │   ├── files.repository.ts
│   │   │   └── storage.adapter.ts
│   │   └── http/
│   │       ├── files.controller.ts
│   │       └── files.routes.ts
│   ├── folders/
│   │   ├── domain/
│   │   │   ├── folders.service.ts
│   │   │   └── folders.types.ts
│   │   ├── infrastructure/
│   │   │   └── folders.repository.ts
│   │   └── http/
│   │       ├── folders.controller.ts
│   │       └── folders.routes.ts
│   └── audit/
│       ├── domain/
│       │   ├── audit.service.ts
│       │   └── audit.types.ts
│       ├── infrastructure/
│       │   └── audit.repository.ts
│       └── http/
│           └── audit.routes.ts
├── shared/
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── errors/
│   │   ├── app.error.ts
│   │   └── http.errors.ts
│   └── types/
│       ├── express.d.ts
│       └── pagination.types.ts
├── config/
│   ├── env.ts
│   ├── database.ts
│   └── multer.ts
└── index.ts
```

### Pasos
1. Crear estructura de carpetas
2. Crear archivos `*.types.ts` con las interfaces principales de cada módulo
3. Crear archivos `*.service.ts` con la clase vacía y métodos stub
4. Crear archivos `*.repository.ts` con la interfaz del repositorio
5. Crear archivos `*.routes.ts` conectando rutas al router de Express
6. Crear `shared/errors/` con la clase base `AppError`
7. Crear `config/env.ts` con validación de variables de entorno
8. Actualizar `index.ts` para montar todos los routers bajo `/api`

---

## Fase 2 — Config y shared detallado

### Objetivo
Infraestructura transversal que todos los módulos usan: validación de ENV al arranque, manejo centralizado de errores, middleware de autenticación, rate limiting y tipos globales de Express.

### Archivos clave
- `config/env.ts` — valida con `zod` que todas las vars de entorno existen y tienen el tipo correcto; falla en arranque si algo falta
- `shared/errors/app.error.ts` — clase base `AppError` con `statusCode` y `code`
- `shared/errors/http.errors.ts` — errores tipados: `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`
- `shared/middlewares/error.middleware.ts` — captura todos los errores y responde con el contrato `{ error: { code, message } }`
- `shared/middlewares/auth.middleware.ts` — verifica JWT y adjunta `req.user`
- `shared/types/express.d.ts` — extiende `Request` de Express para incluir `user`

---

## Decisiones técnicas
- Validación de DTOs: `zod`
- Conexión BD: `pg` (driver nativo de PostgreSQL)
- Migraciones: `node-pg-migrate`
- Hashing: `bcrypt`
- JWT: `jsonwebtoken`
- Seguridad HTTP: `helmet`
- Rate limiting: `express-rate-limit`
- Upload: `multer` (ya instalado)
