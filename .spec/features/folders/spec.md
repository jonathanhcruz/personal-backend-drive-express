# Spec — Feature: Folders ✅ Implementado

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
    { "id": "uuid", "name": "Documentos", "parentId": null, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### GET `/:id` — Contenido de carpeta
```json
{
  "data": {
    "folder": { "id": "uuid", "name": "Documentos", "parentId": null, "createdAt": "...", "updatedAt": "..." },
    "subfolders": [
      { "id": "uuid", "name": "Trabajo", "parentId": "uuid", "createdAt": "...", "updatedAt": "..." }
    ],
    "files": [
      { "id": "uuid", "name": "informe.pdf", "mimeType": "application/pdf", "size": 204800, "createdAt": "..." }
    ]
  }
}
```
> `ownerId` y `storagePath` nunca aparecen en ninguna respuesta.

### GET `/:id/breadcrumb`
```json
{
  "data": [
    { "id": "uuid", "name": "Documentos" },
    { "id": "uuid", "name": "Trabajo" }
  ]
}
```
Ordenado de raíz a carpeta actual. Implementado con CTE recursiva en PostgreSQL.

### POST `/` — Crear carpeta
Request:
```json
{ "name": "Nueva carpeta", "parentId": "uuid | null" }
```
Response `201`:
```json
{ "data": { "id": "uuid", "name": "Nueva carpeta", "parentId": "uuid | null", "createdAt": "...", "updatedAt": "..." } }
```

### PATCH `/:id` — Renombrar
Request:
```json
{ "name": "Nuevo nombre" }
```
Response `200`:
```json
{ "data": { "id": "uuid", "name": "Nuevo nombre", "parentId": "uuid | null", "createdAt": "...", "updatedAt": "..." } }
```

### DELETE `/:id` — Eliminar
Query param opcional: `?recursive=true`
- Sin `recursive` o `recursive=false`: falla si la carpeta tiene archivos o subcarpetas
- Con `recursive=true`: elimina todo el subárbol (archivos de disco + BD en cascada)

Response: `204 No Content`

---

## Reglas de negocio

- `ownerId` nunca sale en ninguna respuesta (usa `FolderPublicDto = Omit<Folder, 'ownerId'>`)
- Toda operación valida `folder.ownerId === userId` autenticado
- `parentId: null` → carpeta en raíz del usuario
- `ON DELETE CASCADE` en BD elimina subcarpetas automáticamente
- Delete recursivo: borra archivos del disco uno a uno **antes** de borrar en BD

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `FOLDER_NOT_FOUND` | 404 | Carpeta no existe |
| `FORBIDDEN` | 403 | Carpeta no pertenece al usuario |
| `CONFLICT` | 409 | Eliminar carpeta no vacía sin `?recursive=true` |
| `VALIDATION_ERROR` | 400 | Body inválido o UUID inválido en params |
