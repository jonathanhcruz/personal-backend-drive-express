# Spec — Feature: Files

## Endpoints (`/api/files`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/upload` | Subir archivo (`multipart/form-data`, campo `file`) | Sí |
| GET | `/` | Listar archivos del usuario (activos) | Sí |
| GET | `/:id` | Metadata de un archivo | Sí |
| GET | `/:id/view` | Visualizar archivo en el browser (inline) | Sí |
| GET | `/:id/download` | Descargar archivo | Sí |
| DELETE | `/:id` | Soft-delete (mover a papelera) | Sí |
| DELETE | `/:id/hard` | Eliminar permanentemente del disco y BD | admin |

---

## Contratos

### POST `/upload`
Request: `multipart/form-data`
- Campo `file`: el archivo
- Campo `folderId` (opcional): UUID de la carpeta destino (null → raíz)

Response `201`:
```json
{
  "data": {
    "id": "uuid",
    "name": "informe.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "checksum": "sha256hex",
    "folderId": "uuid | null",
    "viewUrl": "/api/files/uuid/view",
    "downloadUrl": "/api/files/uuid/download",
    "createdAt": "2026-06-10T..."
  }
}
```
> `storage_path` nunca aparece en ninguna respuesta.

### GET `/` — Listar archivos
Query params opcionales: `folderId`, `mimeType`, `page`, `limit`

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "informe.pdf",
      "mimeType": "application/pdf",
      "size": 204800,
      "folderId": "uuid | null",
      "viewUrl": "/api/files/uuid/view",
      "downloadUrl": "/api/files/uuid/download",
      "createdAt": "..."
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}
```

### GET `/:id` — Metadata
```json
{
  "data": {
    "id": "uuid",
    "name": "informe.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "checksum": "sha256hex",
    "folderId": "uuid | null",
    "viewUrl": "/api/files/uuid/view",
    "downloadUrl": "/api/files/uuid/download",
    "createdAt": "..."
  }
}
```

### GET `/:id/view`
- Valida ownership
- Hace stream del archivo desde disco
- Headers: `Content-Disposition: inline; filename="informe.pdf"`, `Content-Type: application/pdf`
- El browser renderiza el archivo directamente (PDF, imagen, video básico)

### GET `/:id/download`
- Valida ownership
- Hace stream del archivo desde disco
- Headers: `Content-Disposition: attachment; filename="informe.pdf"`, `Content-Type: application/pdf`
- El browser fuerza descarga

### DELETE `/:id` — Soft-delete
Response `200`:
```json
{ "data": { "message": "File moved to trash" } }
```

### DELETE `/:id/hard` — Hard-delete (admin)
Response `200`:
```json
{ "data": { "message": "File permanently deleted" } }
```

---

## Comportamiento de duplicados

- Mismo `name` + mismo `folderId` → `409 Conflict`:
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "A file with this name already exists in this folder",
    "existing": { "id": "uuid", "name": "informe.pdf", "createdAt": "..." }
  }
}
```
- Header `X-Replace: true` en el upload → soft-delete del existente + sube el nuevo

---

## Reglas de negocio

- `storage_path` es interno — nunca sale en ninguna respuesta
- Toda operación valida `file.owner_id === userId` autenticado
- Archivos con `deleted_at` no aparecen en listados ni son accesibles
- Hard-delete requiere rol `admin`
- Upload: disco primero → BD después. Fallo en disco cancela todo
- `viewUrl` y `downloadUrl` los genera el backend — el cliente no construye URLs

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `NOT_FOUND` | 404 | Archivo no existe o fue eliminado |
| `FORBIDDEN` | 403 | Archivo no pertenece al usuario |
| `CONFLICT` | 409 | Nombre duplicado en la misma carpeta |
| `FILE_TOO_LARGE` | 413 | Supera `MAX_FILE_SIZE_MB` |
| `VALIDATION_ERROR` | 400 | Body o params inválidos |
