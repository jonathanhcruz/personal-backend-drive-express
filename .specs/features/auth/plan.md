# Plan — Feature: Auth (Estrategia dual cookie/body)

> Estado actual: secretos JWT separados ✅, rate limiting ✅, cookies pendiente.
> Objetivo: implementar estrategia dual — cookie httpOnly para web + body para Expo.

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Base | Login, JWT, refresh con rotación, logout | ✅ Completado |
| 2 | Fix secreto JWT | Secreto separado para refresh tokens | ✅ Completado |
| 3 | Fix rate limiting | authRateLimit en /refresh y /logout | ✅ Completado |
| 4 | Infraestructura cookies | cors, cookieParser, FRONTEND_URL en env | Pendiente |
| 5 | Controller dual | getRefreshToken helper, cookie en login/refresh/logout | Pendiente |
| 6 | Actualizar specs | Quitar ⚠️, documentar contrato final | Pendiente |

---

## Fase 1 — Base ✅

- `JwtAdapter` — sign/verify access (15m) y refresh (7d)
- `UsersRepository` — findByEmail, findById, setRefreshToken
- `AuthService` — login (bcrypt 12 + SHA-256 hash), refresh (rotación), logout (revocación)
- `AuthController` — zod, contrato actual: todo en body
- Endpoints: `POST /api/auth/login`, `/refresh`, `/logout`

---

## Fase 2 — Fix secreto JWT ✅

Refresh tokens firmados con secreto separado — ya no pasan la verificación del `authMiddleware`.

- `src/config/env.ts` — `REFRESH_TOKEN_SECRET` en schema (min 32 chars) y export
- `src/modules/auth/infrastructure/jwt.adapter.ts` — `signRefreshToken` y `verifyRefreshToken` usan `env.refreshTokenSecret`
- `.env.example` — `REFRESH_TOKEN_SECRET` documentado

---

## Fase 3 — Fix rate limiting ✅

`authRateLimit` aplicado en los tres endpoints de auth:

- `src/modules/auth/http/auth.routes.ts` — `/login`, `/refresh`, `/logout` todos con throttle

---

## Fase 4 — Infraestructura cookies

### Contexto
- `cookie-parser` ya está en `package.json` — solo falta montarlo
- `cors` no está instalado — hay que instalarlo

### Dependencias
```bash
npm install cors
npm install -D @types/cors
```

> `cookie-parser` y `@types/cookie-parser` ya están instalados — no reinstalar.

### `src/index.ts`

Agregar imports:
```ts
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env';
```

Registrar antes de las rutas:
```ts
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(cookieParser());
```

Orden importa: CORS antes que cookieParser, ambos antes de las rutas.

### `src/config/env.ts`

Agregar al schema:
```ts
FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
```

Agregar al export:
```ts
frontendUrl: data.FRONTEND_URL,
```

### `.env.example`

```
# CORS
FRONTEND_URL=http://localhost:5173
```

---

## Fase 5 — Controller dual

### Principio
El controller detecta de dónde leer el refresh token según lo que llegue en el request. Un helper privado centraliza la lógica — un solo punto de cambio.

### Helper privado
```ts
private getRefreshToken(req: Request): string | null {
  return req.cookies?.refreshToken ?? req.body?.refreshToken ?? null;
}
```
- Cookie tiene prioridad sobre body
- Web nunca envía body → usa cookie automáticamente
- Expo nunca envía cookie → usa body

### `login` — respuesta dual
```ts
async login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body');

  const tokens = await this.service.login(parsed.data);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
  });

  res.status(200).json({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
}
```

### `refresh` — leer de cookie o body
```ts
async refresh(req: Request, res: Response): Promise<void> {
  const token = this.getRefreshToken(req);
  if (!token) throw new ValidationError('refreshToken is required');

  const tokens = await this.service.refresh(token);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
}
```

### `logout` — leer de cookie o body, siempre limpiar cookie
```ts
async logout(req: Request, res: Response): Promise<void> {
  const token = this.getRefreshToken(req);
  if (!token) throw new ValidationError('refreshToken is required');

  await this.service.logout(token);

  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.status(200).json({ data: { message: 'Session closed successfully' } });
}
```

> `clearCookie` es idempotente — si no había cookie no falla.
> `logout` ya no lanza error si el token es inválido — simplemente limpia la cookie y responde ok. La sesión queda cerrada desde el cliente de todas formas.

---

## Fase 6 — Actualizar specs

- `.spec/spec.md` — quitar `⚠️ Pendiente actualización — cookie httpOnly`
- `.spec/plan.md` — marcar Fase 4 (Auth) como ✅
- `.spec/features/auth/task.md` — marcar Fases 4 y 5 completadas

---

## Decisiones técnicas

| Decisión | Razón |
|----------|-------|
| Cookie + body simultáneos en login | Cada cliente toma lo que necesita — sin endpoints separados |
| Cookie tiene prioridad sobre body | Web nunca manda body; Expo nunca manda cookie — sin ambigüedad |
| `refreshToken` se mantiene en body | Expo necesita leerlo para guardarlo en SecureStore |
| `Path=/api/auth` en cookie | La cookie no se adjunta a requests de files/folders — reduce overhead |
| `SameSite=Strict` | CSRF protection — SPA y API en el mismo dominio vía Cloudflare Tunnel |
| `clearCookie` siempre en logout | Idempotente — no rompe nada si no había cookie |
| `FRONTEND_URL` en env | CORS con `credentials: true` exige origin explícito, no `*` |
| logout no lanza error si token inválido | La sesión se cierra en el cliente de todas formas — no tiene sentido bloquear el logout |
