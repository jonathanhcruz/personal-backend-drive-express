# Spec — Feature: Folders

## Endpoints (`/api/folders`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/` | Listar carpetas raíz del usuario | Sí |
| GET | `/:id` | Contenido de una carpeta (subcarpetas + archivos) | Sí |
| GET | `/:id/breadcrumb` | Ruta jerárquica desde raíz hasta la carpeta | Sí |
| POST | `/` | Crear carpeta | Sí |
| PATCH | `/:id` | Renombrar carpeta | Sí |
| DELETE | `/:id` | Eliminar carpeta | Sí |

---

## Contratos

### GET `/` — Listar raíz
```json
{
  "data": [
    { "id": "uuid", "name": "Documentos", "createdAt": "...", "updatedAt": "..." },
    { "id": "uuid", "name": "Fotos", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### GET `/:id` — Contenido de carpeta
```json
{
  "data": {
    "folder": { "id": "uuid", "name": "Documentos", "parentId": null },
    "subfolders": [
      { "id": "uuid", "name": "Trabajo", "createdAt": "..." }
    ],
    "files": [
      { "id": "uuid", "name": "informe.pdf", "mimeType": "application/pdf", "size": 204800, "createdAt": "..." }
    ]
  }
}
```
> `storage_path` nunca aparece en ninguna respuesta.

### GET `/:id/breadcrumb`
```json
{
  "data": [
    { "id": "uuid", "name": "Raíz" },
    { "id": "uuid", "name": "Documentos" },
    { "id": "uuid", "name": "Trabajo" }
  ]
}
```
Ordenado de raíz a carpeta actual.

### POST `/` — Crear carpeta
Request:
```json
{ "name": "Nueva carpeta", "parentId": "uuid | null" }
```
Response `201`:
```json
{ "data": { "id": "uuid", "name": "Nueva carpeta", "parentId": "uuid", "createdAt": "..." } }
```

### PATCH `/:id` — Renombrar
Request:
```json
{ "name": "Nuevo nombre" }
```
Response `200`:
```json
{ "data": { "id": "uuid", "name": "Nuevo nombre", "updatedAt": "..." } }
```

### DELETE `/:id` — Eliminar
Query param opcional: `?recursive=true`
- Sin `recursive`: `409 Conflict` si la carpeta tiene contenido
- Con `recursive=true`: elimina todo el subárbol (carpetas + archivos)

Response `200`:
```json
{ "data": { "message": "Folder deleted successfully" } }
```

---

## Reglas de negocio

- El cliente nunca recibe paths reales de disco — solo IDs y metadata
- Toda operación valida que el `folder.owner_id` coincide con el usuario autenticado
- `parentId: null` en crear → carpeta en raíz del usuario
- Eliminar carpeta padre en cascada elimina subcarpetas en BD automáticamente
- Disco y BD siempre sincronizados: fallo en disco cancela la operación en BD

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `NOT_FOUND` | 404 | Carpeta no existe |
| `FORBIDDEN` | 403 | Carpeta no pertenece al usuario |
| `CONFLICT` | 409 | Intento de eliminar carpeta no vacía sin `?recursive=true` |
| `VALIDATION_ERROR` | 400 | Body inválido |
