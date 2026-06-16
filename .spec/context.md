# Context — Backend Drive

## ¿Qué es?
API REST construida con Node.js + Express 5 + TypeScript para el sistema de almacenamiento privado PrivateDrive. Expone los endpoints que consume el frontend y gestiona archivos físicos, autenticación, permisos y auditoría.

## Arquitectura elegida
Hexagonal por módulo (pragmática). Cada módulo encapsula su propia lógica de dominio, infraestructura y capa HTTP. Esto permite añadir nuevas capacidades (streaming, sharing) sin tocar módulos existentes.

## Estructura de capas por módulo
```
modules/<nombre>/
  domain/        → lógica de negocio pura, sin framework ni librerías externas
  infrastructure/→ implementaciones concretas (BD, filesystem, JWT, etc.)
  http/          → entrada HTTP (controller + routes)
```

## Módulos

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| auth | Autenticación JWT + refresh tokens con rotación | ✅ Implementado |
| users | Usuario único admin gestionado en BD (sin rutas) | ✅ Implementado |
| files | Upload, download (Range), delete, share tokens | ✅ Implementado |
| folders | CRUD jerárquico, breadcrumb, delete recursivo | ✅ Implementado |
| share | Descarga pública via token (router sin auth) | ✅ Implementado |
| audit | Log de acciones del sistema | Pendiente |
| media | Streaming HLS, thumbnails de video | Futuro |

## Decisiones técnicas firmes
- Nunca leer/escribir archivos físicos fuera del módulo `files` (y `media` en el futuro)
- Toda la lógica de negocio vive en `domain/` — sin imports de express ni pg ahí
- Repositorios como única vía de acceso a la base de datos
- Errores tipados y centralizados en `shared/errors/`
- Variables de entorno validadas en el arranque (`config/env.ts`)
- Sin `any` en TypeScript (ESLint lo bloquea)

## Restricciones heredadas del proyecto raíz
- Archivos físicos NUNCA en Docker — solo en volúmenes del disco externo
- Contraseñas bcrypt cost 12
- JWT con expiración corta + refresh token
- Rate limiting en endpoints de autenticación
