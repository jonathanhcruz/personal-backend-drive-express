# Tasks — Feature: Auth ✅ Completado

## Pendiente
_Nada pendiente._

## Completado

### Fase 2 — Fix secreto JWT (CRÍTICA)
- [x] `src/config/env.ts` — agregar `REFRESH_TOKEN_SECRET` al schema y al export
- [x] `src/modules/auth/infrastructure/jwt.adapter.ts` — usar `env.refreshTokenSecret` en `signRefreshToken` y `verifyRefreshToken`
- [x] `.env.example` — agregar `REFRESH_TOKEN_SECRET`

### Fase 3 — Fix rate limiting (MEDIA)
- [x] `src/modules/auth/http/auth.routes.ts` — `authRateLimit` en `/refresh` y `/logout`

### Fase 4 — Infraestructura cookies
- [x] `npm install cors @types/cors`
- [x] `src/index.ts` — montar `cors({ origin: env.frontendUrl, credentials: true })` + `cookieParser()`
- [x] `src/config/env.ts` — agregar `FRONTEND_URL`
- [x] `.env.example` — agregar `FRONTEND_URL`

### Fase 5 — Controller dual
- [x] `AuthController` — helper privado `getRefreshToken(req)` (cookie > body)
- [x] `AuthController.login` — cookie httpOnly + `refreshToken` en body
- [x] `AuthController.refresh` — usa helper, respuesta dual
- [x] `AuthController.logout` — usa helper, `clearCookie` siempre

### Fase 1 — Base
- [x] `JwtAdapter` — sign/verify access (15m) y refresh (7d)
- [x] `UsersRepository` — findByEmail, findById, setRefreshToken
- [x] `AuthService` — login, refresh (rotación), logout (revocación)
- [x] `AuthController` — zod, endpoints funcionales con contrato body
- [x] `POST /api/auth/login`, `/refresh`, `/logout` operativos

---
_Actualizar al iniciar o terminar cada tarea._
