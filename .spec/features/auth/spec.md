# Spec — Feature: Auth

## Estado: ⚠️ Parcialmente implementado — pendiente estrategia dual cookie/body

> Implementación actual: refreshToken viaja en el body en todos los endpoints.
> Cambio pendiente: estrategia dual — cookie httpOnly para web + body para Expo.

---

## Endpoints (`/api/auth`)

| Método | Ruta | Auth requerida |
|--------|------|----------------|
| POST | `/login` | No |
| POST | `/refresh` | No |
| POST | `/logout` | No |

---

## Contratos

### POST `/api/auth/login`

Request:
```json
{ "email": "admin@example.com", "password": "secret" }
```

Response `200`:
```
Set-Cookie: refreshToken=<uuid>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
Body: { "data": { "accessToken": "...", "refreshToken": "..." } }
```

- Web: ignora `refreshToken` del body, usa la cookie automáticamente
- Expo: lee `refreshToken` del body y lo guarda en `expo-secure-store`

---

### POST `/api/auth/refresh`

Renueva el access token. Lee el refresh token de donde venga:
- **Web**: no envía nada en body — el navegador adjunta la cookie automáticamente
- **Expo**: envía `{ refreshToken: "..." }` en el body

Request (Expo):
```json
{ "refreshToken": "..." }
```

Request (Web): body vacío, cookie enviada automáticamente.

Response `200`:
```
Set-Cookie: refreshToken=<nuevo>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
Body: { "data": { "accessToken": "...", "refreshToken": "..." } }
```

Errores:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "refreshToken is required" } }
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid or revoked token" } }
```

---

### POST `/api/auth/logout`

Revoca el refresh token y cierra la sesión.
- **Web**: cookie enviada automáticamente, servidor la limpia con `Max-Age=0`
- **Expo**: envía `{ refreshToken: "..." }` en body, borra `expo-secure-store` en cliente

Request (Expo):
```json
{ "refreshToken": "..." }
```

Response `200`:
```
Set-Cookie: refreshToken=; HttpOnly; Path=/api/auth; Max-Age=0
Body: { "data": { "message": "Session closed successfully" } }
```

---

## Configuración de cookie

| Atributo | Valor | Razón |
|----------|-------|-------|
| `HttpOnly` | true | JavaScript no puede leerla — protección XSS |
| `Secure` | true | Solo HTTPS — Cloudflare Tunnel lo garantiza en prod |
| `SameSite` | Strict | Solo se envía al mismo dominio — protección CSRF |
| `Path` | `/api/auth` | La cookie no se envía en cada request, solo en auth |
| `Max-Age` | 604800 | 7 días, igual que la expiración del JWT refresh |

---

## Flujo web (SPA)

```
1. POST /login         → guarda accessToken en memoria, cookie seteada por servidor
2. Request autenticado → envía accessToken en header Authorization: Bearer <token>
3. POST /refresh       → no envía nada, cookie va automática → recibe nuevo accessToken
4. POST /logout        → no envía nada, cookie va automática → servidor la limpia
```

## Flujo Expo (React Native)

```
1. POST /login         → guarda accessToken en memoria, guarda refreshToken en SecureStore
2. Request autenticado → envía accessToken en header Authorization: Bearer <token>
3. POST /refresh       → lee SecureStore, envía en body → recibe nuevo accessToken + refreshToken
                         actualiza SecureStore
4. POST /logout        → lee SecureStore, envía en body → borra SecureStore local
```

---

## Lógica de detección en el backend

El controller resuelve qué fuente usar con un helper privado:

```ts
private getRefreshToken(req: Request): string | null {
  return req.cookies?.refreshToken ?? req.body?.refreshToken ?? null;
}
```

Prioridad: **cookie > body**. Si la cookie está presente siempre gana (web). Si no, lee del body (Expo).

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos |
| `UNAUTHORIZED` | 401 | Token inválido, expirado o revocado |
| `VALIDATION_ERROR` | 400 | Body inválido o token ausente en ambas fuentes |

---

## Variables de entorno requeridas

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://localhost:5173` | Origen permitido en CORS para web |

---

## Seguridad

- Access token: JWT 15 minutos, enviado en header `Authorization: Bearer`
- Refresh token: JWT 7 días, hash SHA-256 almacenado en BD (no el token raw)
- Rotación: cada `/refresh` emite un token nuevo e invalida el anterior
- Bcrypt cost: 12
