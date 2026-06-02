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
| POST | `/upload` | Subir archivo (multipart/form-data) | Sí |
| GET | `/` | Listar archivos (con filtros) | Sí |
| GET | `/:id/download` | Descargar archivo | Sí |
| DELETE | `/:id` | Mover a papelera (borrado lógico) | Sí |
| DELETE | `/:id/hard` | Eliminar permanentemente | admin |

### Folders (`/api/folders`)
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| GET | `/` | Listar carpetas raíz | Sí |
| GET | `/:id` | Contenido de una carpeta | Sí |
| POST | `/` | Crear carpeta | Sí |
| PATCH | `/:id` | Renombrar carpeta | Sí |
| DELETE | `/:id` | Eliminar carpeta | Sí |

### Sharing (`/api/sharing`) — Fase 2
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/` | Crear link de compartir | admin |
| GET | `/public/:token` | Acceder a recurso compartido | No |
| DELETE | `/:id` | Revocar acceso | admin |

### Media (`/api/media`) — Futuro
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/:id/stream` | Streaming con rangos de bytes (HLS) |
| GET | `/:id/thumbnail` | Thumbnail de video |

## Contratos de respuesta

### Éxito
```json
{ "data": { ... }, "meta": { "page": 1, "total": 42 } }
```

### Error
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Token inválido o expirado" } }
```

## Seguridad
- JWT access token: expiración 15 minutos
- JWT refresh token: expiración 7 días, rotación en cada uso
- Bcrypt cost: 12
- Rate limiting: 10 intentos / 15 min en `/auth/login`
- Headers de seguridad vía `helmet`
- CORS restringido al origen del frontend

## Validación
- DTOs validados con `zod` en el borde HTTP (antes de llegar al dominio)
- Tamaño máximo de archivo: configurable vía ENV (`MAX_FILE_SIZE_MB`)
- Tipos de archivo permitidos: configurable vía ENV (`ALLOWED_MIME_TYPES`)
