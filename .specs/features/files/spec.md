# Spec — Feature: Files ✅ Implementado

## Endpoints (`/api/files`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/upload` | Subir archivo (`multipart/form-data`, campo `file`) | Sí |
| GET | `/` | Listar archivos por carpeta | Sí |
| GET | `/:id` | Metadata de un archivo | Sí |
| GET | `/:id/download` | Descargar archivo (soporta Range requests) | Sí |
| PATCH | `/:id` | Renombrar archivo | Sí |
| PATCH | `/:id/move` | Mover archivo a otra carpeta | Sí |
| DELETE | `/:id` | Eliminar archivo de disco y BD | Sí |
| POST | `/:id/share` | Crear token de compartir (1-uso, 8h) | Sí |
| GET | `/:id/share` | Listar tokens activos del archivo | Sí |
| DELETE | `/share/:tokenId` | Revocar token de compartir | Sí |

> **Importante — orden de rutas**: `DELETE /share/:tokenId` y `GET /:id/share` deben registrarse **antes** de `GET /:id` y `DELETE /:id` para que Express no interprete "share" como un `:id`.

---

## Contratos

### POST `/upload` — Subir archivo
Request: `multipart/form-data`, campo `file`
Query param `folderId`: UUID de la carpeta destino (opcional — si se omite, el archivo queda en la raíz)

> Ruta física en disco: `{STORAGE_PATH}/{userId}/{folderId}/` cuando hay carpeta; `{STORAGE_PATH}/{userId}/root/` cuando se sube a raíz.

Response `201`:
```json
{
  "data": {
    "id": "uuid",
    "name": "informe.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "checksum": "sha256hex",
    "folderId": "uuid",
    "uploadedBy": "uuid",
    "deletedAt": null,
    "createdAt": "2026-06-10T..."
  }
}
```
> `storagePath` nunca aparece en ninguna respuesta (`FilePublicDto = Omit<FileRecord, 'storagePath'>`).

### GET `/` — Listar archivos
Query param: `folderId` (UUID, opcional — si se omite devuelve los archivos en raíz del usuario)

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "informe.pdf",
      "mimeType": "application/pdf",
      "size": 204800,
      "checksum": "sha256hex",
      "folderId": "uuid",
      "uploadedBy": "uuid",
      "deletedAt": null,
      "createdAt": "..."
    }
  ]
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
    "folderId": "uuid",
    "uploadedBy": "uuid",
    "deletedAt": null,
    "createdAt": "..."
  }
}
```

### GET `/:id/download` — Descargar
- Valida ownership
- Responde stream binario desde disco
- Headers: `Content-Disposition: attachment; filename*=UTF-8''<nombre>`, `Content-Type`, `Accept-Ranges: bytes`
- Descarga completa: `200 OK` + `Content-Length`
- Range request (`Range: bytes=<start>-<end>`): `206 Partial Content` + `Content-Range`

### PATCH `/:id` — Renombrar archivo
Body: `{ "name": "nuevo-nombre.pdf" }`

Response `200`:
```json
{
  "data": {
    "id": "uuid",
    "name": "nuevo-nombre.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "checksum": "sha256hex",
    "folderId": "uuid",
    "uploadedBy": "uuid",
    "deletedAt": null,
    "createdAt": "..."
  }
}
```
- Solo actualiza la columna `name` en BD — el archivo físico no se mueve
- Valida que no exista ya un archivo con el mismo nombre en la misma carpeta (`409 CONFLICT`)

### PATCH `/:id/move` — Mover archivo
Body: `{ "targetFolderId": "uuid" }` o `{ "targetFolderId": null }` para mover a raíz

Response `200`:
```json
{
  "data": {
    "id": "uuid",
    "name": "informe.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "checksum": "sha256hex",
    "folderId": "uuid-carpeta-destino",
    "uploadedBy": "uuid",
    "deletedAt": null,
    "createdAt": "..."
  }
}
```
- Solo actualiza `folder_id` en BD — el archivo físico no se mueve (`storage_path` permanece igual)
- `targetFolderId: null` mueve el archivo a la raíz (`folder_id = NULL`)
- Si `targetFolderId` es la misma ubicación actual (incluido null = null) → no-op, devuelve el archivo sin cambios
- Valida que no exista un archivo con el mismo nombre en el destino (`409 CONFLICT`)
- `FOLDER_NOT_FOUND` solo aplica cuando `targetFolderId` no es null

### DELETE `/:id` — Eliminar
Elimina el archivo del disco y de la BD (hard delete).

Response: `204 No Content`

### POST `/:id/share` — Crear token
Response `201`:
```json
{
  "data": {
    "token": "uuid",
    "expiresAt": "2026-06-15T22:00:00.000Z"
  }
}
```
- Token válido por 8 horas
- Token de un solo uso — se invalida en la primera descarga

### GET `/:id/share` — Listar tokens activos
Solo devuelve tokens que no han sido usados y no han expirado.

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "expiresAt": "2026-06-15T22:00:00.000Z",
      "createdAt": "2026-06-15T14:00:00.000Z"
    }
  ]
}
```

### DELETE `/share/:tokenId` — Revocar token
Elimina el token de la BD.

Response: `204 No Content`

### GET `/shares` — Listar todos los tokens activos del usuario
Devuelve todos los tokens activos (no usados, no expirados) de todos los archivos del usuario.

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "fileId": "uuid",
      "fileName": "informe.pdf",
      "expiresAt": "2026-06-15T22:00:00.000Z",
      "createdAt": "2026-06-15T14:00:00.000Z"
    }
  ]
}
```

---

## Reglas de negocio

- `storagePath` es interno — nunca sale en ninguna respuesta
- Toda operación valida `file.uploadedBy === userId` autenticado
- Upload: disco primero → BD después. Si BD falla → elimina archivo del disco
- Duplicados: mismo nombre + misma carpeta → `409 CONFLICT`
- Delete: hard delete (no soft). Elimina de disco y de BD
- Share tokens: 1-uso, 8h de vida, múltiples tokens por archivo permitidos
- `markUsed` se llama antes de iniciar el stream → previene race conditions

---

## Ruta de almacenamiento en disco
```
{STORAGE_PATH}/{userId}/{folderId}/{uuid}.{ext}
```
Gestionada por `multer diskStorage`. El backend es el único que conoce esta ruta.

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `FILE_NOT_FOUND` | 404 | Archivo no existe |
| `FOLDER_NOT_FOUND` | 404 | Carpeta destino no existe en upload o en move |
| `FORBIDDEN` | 403 | El archivo o carpeta no pertenece al usuario |
| `CONFLICT` | 409 | Nombre duplicado en la misma carpeta |
| `FILE_TOO_LARGE` | 413 | Supera `MAX_FILE_SIZE_MB` |
| `NO_FILE` | 400 | Upload sin campo `file` |
| `SHARE_TOKEN_NOT_FOUND` | 404 | Token no existe en revocación |
| `VALIDATION_ERROR` | 400 | Body o params inválidos |
| `STREAM_ERROR` | 500 | Error leyendo el archivo del disco |
