# Spec — Feature: Folder ZIP Download

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/folders/:id/download` | Descarga la carpeta completa como archivo ZIP | Sí |

---

## Contratos

### GET `/api/folders/:id/download` — Descargar carpeta como ZIP

Descarga recursiva de todos los archivos y subcarpetas con contenido, empaquetados en un ZIP con jerarquía de rutas preservada.

**Response `200 OK`:**
```
Content-Type: application/zip
Content-Disposition: attachment; filename*=UTF-8''<nombre-carpeta>.zip
```
Stream binario ZIP. No se incluye `Content-Length` — el tamaño no se conoce hasta que el archivo se arma completamente.

**Estructura interna del ZIP:**
```
Documentos/
  informe.pdf
  Trabajo/
    contrato.docx
    Imágenes/
      foto.png
```
El nombre de la carpeta raíz solicitada es siempre el primer nivel dentro del ZIP.

**Ejemplo de rutas en el ZIP:**
| Archivo en BD | Ruta dentro del ZIP |
|---------------|---------------------|
| `informe.pdf` (en `Documentos`) | `Documentos/informe.pdf` |
| `contrato.docx` (en `Documentos/Trabajo`) | `Documentos/Trabajo/contrato.docx` |
| `foto.png` (en `Documentos/Trabajo/Imágenes`) | `Documentos/Trabajo/Imágenes/foto.png` |

**Carpeta vacía o con solo subcarpetas vacías:** devuelve un ZIP vacío (`200 OK`). No es un error.

---

## Reglas de negocio

- Valida ownership: `folder.ownerId === userId` autenticado
- El ZIP se arma en streaming — ningún archivo temporal se crea en el servidor
- Solo se incluyen archivos no eliminados (`deleted_at IS NULL`)
- Solo se incluyen archivos cuyo `uploadedBy` coincide con el usuario autenticado
- Subcarpetas vacías (sin archivos directos ni en sus descendientes) no generan entradas en el ZIP — si no hay contenido, no hay nada que descargar
- Los nombres de carpetas y archivos se sanitizan antes de construir rutas ZIP: `/`, `\`, null bytes y segmentos `..` se reemplazan por `_` para prevenir Zip Slip
- El nivel de compresión interno es `zlib level 6` (balance velocidad/tamaño)
- Si un archivo del disco no existe durante el stream, el ZIP queda truncado — se loguea el error
- Si el cliente se desconecta antes de que termine la descarga, el servidor aborta el stream
- No hay límite de tamaño impuesto por el endpoint; la responsabilidad es del cliente o de un proxy upstream
- `storagePath` de cada archivo nunca se expone en headers ni en el body

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `FOLDER_NOT_FOUND` | 404 | La carpeta no existe |
| `FORBIDDEN` | 403 | La carpeta no pertenece al usuario autenticado |
| `VALIDATION_ERROR` | 400 | `:id` no es un UUID válido |
| `STREAM_ERROR` | 500 | Error durante el streaming del ZIP antes de que se enviaran headers |
