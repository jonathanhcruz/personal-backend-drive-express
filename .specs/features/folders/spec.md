# Spec — Feature: Folders ✅ Implementado

## Endpoints (`/api/folders`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/` | Contenido de la carpeta raíz del usuario (subcarpetas + archivos) | Sí |
| GET | `/:id` | Contenido de una carpeta (subcarpetas + archivos) | Sí |
| GET | `/:id/breadcrumb` | Ruta jerárquica desde raíz hasta la carpeta | Sí |
| GET | `/:id/download` | Descargar carpeta completa como ZIP | Sí |
| POST | `/` | Crear carpeta | Sí |
| PATCH | `/:id` | Renombrar carpeta | Sí |
| PATCH | `/:id/move` | Mover carpeta a otra carpeta (o raíz) | Sí |
| DELETE | `/:id` | Eliminar carpeta | Sí |

---

## Contratos

### GET `/` — Contenido raíz
Devuelve las subcarpetas y archivos directamente anclados a la carpeta raíz del usuario. Arrays vacíos si no hay contenido (no es 404).

```json
{
  "data": {
    "subfolders": [
      { "id": "uuid", "name": "Documentos", "parentId": "uuid-root", "hasChildren": true, "createdAt": "...", "updatedAt": "..." },
      { "id": "uuid", "name": "Trabajo", "parentId": "uuid-root", "hasChildren": false, "createdAt": "...", "updatedAt": "..." }
    ],
    "files": [
      { "id": "uuid", "name": "notas.txt", "mimeType": "text/plain", "size": 1024, "createdAt": "..." }
    ]
  }
}
```

### GET `/:id` — Contenido de carpeta
```json
{
  "data": {
    "folder": { "id": "uuid", "name": "Documentos", "parentId": "uuid-root", "hasChildren": true, "createdAt": "...", "updatedAt": "..." },
    "subfolders": [
      { "id": "uuid", "name": "Trabajo", "parentId": "uuid", "hasChildren": false, "createdAt": "...", "updatedAt": "..." }
    ],
    "files": [
      { "id": "uuid", "name": "informe.pdf", "mimeType": "application/pdf", "size": 204800, "createdAt": "..." }
    ]
  }
}
```
> `ownerId` nunca aparece en ninguna respuesta (`FolderPublicDto = Omit<Folder, 'ownerId'>`).
> `hasChildren: true` indica que la carpeta tiene subcarpetas — el frontend puede usar este dato para mostrar la flecha de navegación sin hacer requests adicionales.

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
- La carpeta raíz (`__root__`) **nunca aparece** en el resultado — se filtra en la query
- El primer elemento es la carpeta de primer nivel visible (hija directa de root)
- "Mi Drive" no aparece en el resultado — es una etiqueta estática del frontend

### POST `/` — Crear carpeta
Request:
```json
{ "name": "Nueva carpeta", "parentId": "uuid | null" }
```
Response `201`:
```json
{ "data": { "id": "uuid", "name": "Nueva carpeta", "parentId": "uuid | null", "hasChildren": false, "createdAt": "...", "updatedAt": "..." } }
```

### PATCH `/:id` — Renombrar
Request:
```json
{ "name": "Nuevo nombre" }
```
Response `200`:
```json
{ "data": { "id": "uuid", "name": "Nuevo nombre", "parentId": "uuid | null", "hasChildren": true, "createdAt": "...", "updatedAt": "..." } }
```

### PATCH `/:id/move` — Mover carpeta
Body: `{ "targetParentId": "uuid | null" }` (`null` = mover a raíz)

Response `200`:
```json
{ "data": { "id": "uuid", "name": "Trabajo", "parentId": "uuid-destino | null", "hasChildren": false, "createdAt": "...", "updatedAt": "..." } }
```
- Si `targetParentId` es el mismo `parentId` actual → devuelve la carpeta sin cambios (no-op)
- Valida que el destino no sea un descendiente de la carpeta (detecta ciclos) → `400 VALIDATION_ERROR`
- Valida que no exista otra carpeta con el mismo nombre en el destino → `409 CONFLICT`

### DELETE `/:id` — Eliminar
Query param opcional: `?recursive=true`
- Sin `recursive` o `recursive=false`: falla si la carpeta tiene **subcarpetas** (no verifica archivos directos — si solo tiene archivos, los elimina junto con la carpeta)
- Con `recursive=true`: elimina todo el subárbol (archivos de disco + BD en cascada)

Response: `204 No Content`

---

## Reglas de negocio

- `ownerId` nunca sale en ninguna respuesta (usa `FolderPublicDto = Omit<Folder, 'ownerId'>`)
- Toda operación valida `folder.ownerId === userId` autenticado
- Cada usuario tiene exactamente **una carpeta raíz** (`__root__`, `parent_id IS NULL`) creada automáticamente por trigger al registrarse
- La carpeta raíz es **completamente invisible**: nunca se devuelve como entidad en ninguna respuesta; acceder a `GET /:id` con el UUID de root devuelve `404`
- No se puede renombrar, mover ni eliminar la carpeta raíz
- `parentId: null` en el input de crear/mover → se interpreta como "colocar en root" (el backend resuelve al UUID real)
- Las carpetas de primer nivel visible tienen `parentId = uuid-root` (no null)
- `ON DELETE CASCADE` en BD elimina subcarpetas automáticamente
- Delete recursivo: borra archivos del disco uno a uno **antes** de borrar en BD

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `FOLDER_NOT_FOUND` | 404 | Carpeta no existe o carpeta destino no existe |
| `FORBIDDEN` | 403 | Carpeta no pertenece al usuario |
| `CONFLICT` | 409 | Nombre duplicado en destino / eliminar carpeta no vacía sin `?recursive=true` |
| `VALIDATION_ERROR` | 400 | Body inválido, UUID inválido en params, o mover carpeta dentro de sus propios descendientes |
