# Plan — Feature: Share Tokens ✅ Completado

> Diseño original: módulo `sharing` independiente con tabla `shared_links`, permisos `view/download`, `revoked_at`.
> Diseño implementado: tokens integrados en módulo `files`, 1-uso, 8h fijos, sin campo permission.

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Base de datos | Tabla `file_share_tokens` | ✅ Completado |
| 2 | CRUD tokens | Crear, listar activos, revocar | ✅ Completado |
| 3 | Acceso público | Router sin auth, redención 1-uso | ✅ Completado |

---

## Fase 1 — Base de datos ✅

```sql
CREATE TABLE file_share_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `used_at NULL` → token disponible
- `used_at NOT NULL` → token ya usado (one-time burn)
- `expires_at` → calculado en creación como `now() + 8h`
- `ON DELETE CASCADE` → si se borra el archivo, sus tokens desaparecen

---

## Fase 2 — CRUD tokens ✅

### Crear token
- Solo el owner del archivo puede crear
- `expiresAt = now() + 8h` (fijo, no configurable por el cliente)
- Retorna `{ token: id, expiresAt }`

### Listar tokens activos
- `WHERE used_at IS NULL AND expires_at > now()` — filtra ya usados y expirados
- Retorna `[{ id, expiresAt, createdAt }]`

### Revocar token
- Solo el owner puede revocar
- Verifica ownership: `shareTokensRepo.findById` → `filesRepo.findById(token.fileId)` → check `uploadedBy`
- `shareTokensRepo.delete(tokenId)` — elimina la fila

---

## Fase 3 — Acceso público ✅

### Router separado
`src/modules/share/http/share.routes.ts` — montado en `index.ts` como `/api/share` **antes** del auth middleware para que las descargas públicas no requieran JWT.

### Flujo de redención
1. Parsea y valida UUID del token
2. `filesService.redeemToken(tokenId)`:
   a. Busca token → `SHARE_TOKEN_NOT_FOUND` si no existe
   b. Verifica `used_at IS NULL` → `SHARE_TOKEN_USED` si ya usado
   c. Verifica `expiresAt > now()` → `SHARE_TOKEN_EXPIRED` si expirado
   d. Llama `markUsed(tokenId)` — quema el token antes del stream
   e. Retorna el `FileRecord` para hacer el stream
3. Stream del archivo (misma lógica Range que download autenticado)

---

## Decisiones técnicas

| Decisión | Razón |
|----------|-------|
| Integrado en módulo `files` | Los tokens son por archivo — no tiene sentido un módulo separado |
| 1-uso (markUsed) en vez de multi-uso | Archivos sensibles — el usuario decide cuándo volver a compartir |
| 8h fijos | Ventana corta reduce riesgo de tokens filtrados en uso |
| `markUsed` antes del stream | Race condition: dos requests simultáneos con el mismo token, solo uno pasa |
| Sin campo `permission` | Solo download — no hay vista inline por ahora |
| Revocar elimina la fila | Sin necesidad de auditoría de revocaciones por ahora |
| Router público separado | Más limpio que excepciones en el auth middleware |
| Deuda técnica: lógica de stream duplicada | `FilesController.download` y `ShareController.downloadPublic` son casi idénticos. Pendiente refactor a helper. |
