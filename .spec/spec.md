# Spec — Backend Drive API

## Endpoints por módulo

### Auth (`/api/auth`)
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| POST | `/login` | Login con usuario + contraseña | No |
| POST | `/refresh` | Renovar access token con refresh token | No |
| POST | `/logout` | Invalida el refresh token activo | Sí |

### Users (`/api/users`)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| GET | `/` | Listar usuarios | admin |
| POST | `/` | Crear usuario | admin |
| PATCH | `/:id` | Actualizar usuario | admin |
| DELETE | `/:id` | Desactivar usuario (borrado lógico) | admin |

### Files (`/api/files`)
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| POST | `/upload` | Subir archivo (`multipart/form-data`, campo `file`) | Sí |
| GET | `/` | Listar archivos (con filtros) | Sí |
| GET | `/:id/download` | Descargar archivo | Sí |
| DELETE | `/:id` | Mover a papelera (borrado lógico) | Sí |
| DELETE | `/:id/hard` | Eliminar permanentemente | admin |

#### Comportamiento de duplicados en upload
- Mismo nombre + misma carpeta → `409 Conflict` con info del archivo existente
- Header `X-Replace: true` → soft-delete del anterior + upload del nuevo
- Sin BD activa: no hay detección de duplicados (comportamiento actual)

### Folders (`/api/folders`)
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| GET | `/` | Listar carpetas raíz | Sí |
| GET | `/:id` | Contenido de una carpeta (subcarpetas + archivos) | Sí |
| POST | `/` | Crear carpeta | Sí |
| PATCH | `/:id` | Renombrar carpeta | Sí |
| DELETE | `/:id` | Eliminar carpeta | Sí |

### Sharing (`/api/sharing`) — Fase 9
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/` | Crear link de compartir | admin |
| GET | `/public/:token` | Acceder a recurso compartido | No |
| DELETE | `/:id` | Revocar acceso | admin |

### Media (`/api/media`) — Fase 10 (Futuro)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/:id/stream` | Streaming con rangos de bytes (HLS) |
| GET | `/:id/thumbnail` | Thumbnail de video |

---

## Contratos de respuesta

### Éxito
```json
{ "data": { ... } }
```

### Éxito paginado
```json
{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 42 } }
```

### Error
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Token inválido o expirado" } }
```

### Códigos de error estándar
| Código | Status | Descripción |
|--------|--------|-------------|
| `NOT_FOUND` | 404 | Recurso no existe |
| `UNAUTHORIZED` | 401 | Token inválido o ausente |
| `FORBIDDEN` | 403 | Sin permisos para este recurso |
| `VALIDATION_ERROR` | 400 | Body o params inválidos |
| `CONFLICT` | 409 | Recurso ya existe (ej. nombre duplicado) |
| `FILE_TOO_LARGE` | 413 | Archivo supera `MAX_FILE_SIZE_MB` |
| `INTERNAL_ERROR` | 500 | Error no controlado |

---

## Seguridad
- JWT access token: expiración 15 minutos
- JWT refresh token: expiración 7 días, rotación en cada uso
- Bcrypt cost: 12
- Rate limiting: 10 intentos / 15 min en `/api/auth/login`
- Headers de seguridad vía `helmet`
- CORS restringido al origen del frontend

---

## Validación
- DTOs validados con `zod` en el borde HTTP (antes de llegar al dominio)
- Tamaño máximo de archivo: `MAX_FILE_SIZE_MB` (default 100)
- Tipos de archivo permitidos: `ALLOWED_MIME_TYPES` (vacío = todos permitidos)
- Campo del formulario multipart para upload: `file`
