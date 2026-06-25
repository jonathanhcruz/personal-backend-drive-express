# PrivateDrive — Backend API

Self-hosted private cloud storage. Node.js + Express 5 + TypeScript, hexagonal architecture, PostgreSQL.

---

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js + TypeScript (strict) |
| Framework | Express 5 |
| Database | PostgreSQL (`pg.Pool`, no ORM) |
| Migrations | `node-pg-migrate` |
| Auth | JWT (access 15m / refresh 7d), bcrypt 12 rounds |
| Storage | Local disk via `multer diskStorage` |
| Validation | `zod` at HTTP layer |

---

## Architecture

Hexagonal (ports & adapters) — each module has three layers:

```
src/
├── modules/
│   ├── auth/       domain / infrastructure / http
│   ├── users/      domain / infrastructure / http
│   ├── files/      domain / infrastructure / http
│   ├── folders/    domain / infrastructure / http
│   ├── share/      http  (public download, no auth)
│   └── audit/      (stubs — Fase 8)
├── shared/
│   ├── constants/  error-codes.ts
│   ├── middlewares/ auth, error, rate-limit
│   ├── errors/     AppError, http.errors
│   └── types/      express.d.ts
├── config/         env.ts, database.ts, multer.ts
└── index.ts
```

- **domain** — business logic, interfaces (ports)
- **infrastructure** — DB repositories, JWT adapter, storage adapter (adapters)
- **http** — Express controllers + routes (entry point)

---

## Configuration

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret for signing **access tokens** |
| `REFRESH_TOKEN_SECRET` | Yes (min 32 chars) | — | Secret for signing **refresh tokens** (separate from access) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token TTL |
| `REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `STORAGE_PATH` | Yes | — | Absolute path for file storage (e.g. `/mnt/nas-data`) |
| `MAX_FILE_SIZE_MB` | No | `100` | Upload size limit in MB |
| `ALLOWED_MIME_TYPES` | No | `` (all) | Comma-separated allowed MIME types |
| `FRONTEND_URL` | Yes | — | CORS allowed origin (e.g. `http://localhost:5173`) |

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Setup

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate:up

# Seed admin user (run once)
node scripts/seed-admin.js

# Development
npm run dev

# Production
npm run build && npm start
```

---

## Authentication

Two separate JWT secrets prevent token confusion attacks (a refresh token cannot be used as an access token).

**Dual cookie/body strategy:**
- Web (browser): refresh token is set as an `httpOnly` cookie — browser sends it automatically
- Expo / React Native: refresh token is also returned in the response body — store in `expo-secure-store`

**Cookie config (production):**
`HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800`

All authenticated endpoints require:
```
Authorization: Bearer <accessToken>
```

---

## Response format

**Success with body:**
```json
{ "data": { ... } }
```

**Success list:**
```json
{ "data": [ ... ] }
```

**Success no body:**
```
204 No Content
```

**Error:**
```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

`code` is stable — use it for client logic. `message` is informational.

---

## Error codes

| Code | Status | When |
|------|--------|------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing, invalid, or revoked token |
| `FORBIDDEN` | 403 | Resource belongs to another user |
| `FILE_NOT_FOUND` | 404 | File does not exist |
| `FOLDER_NOT_FOUND` | 404 | Folder does not exist |
| `SHARE_TOKEN_NOT_FOUND` | 404 | Share token does not exist |
| `SHARE_TOKEN_USED` | 403 | Token already redeemed (one-use) |
| `SHARE_TOKEN_EXPIRED` | 403 | Token expired (8h TTL) |
| `NOT_FOUND` | 404 | Generic not found |
| `CONFLICT` | 409 | Duplicate name in same folder |
| `VALIDATION_ERROR` | 400 | Invalid body or params |
| `FILE_TOO_LARGE` | 413 | File exceeds `MAX_FILE_SIZE_MB` |
| `NO_FILE` | 400 | Upload request has no file attached |
| `STREAM_ERROR` | 500 | Failed to read file from disk |
| `INTERNAL_ERROR` | 500 | Unhandled error |

---

## Endpoints

### Auth — `/api/auth`

> Rate limited: 10 requests / 15 min per IP on all auth endpoints.

---

#### `POST /api/auth/login`

Authenticate and receive tokens.

**Headers:** none required

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

Also sets cookie:
```
Set-Cookie: refreshToken=eyJhbGci...; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

**Errors:** `INVALID_CREDENTIALS` (401), `VALIDATION_ERROR` (400)

---

#### `POST /api/auth/refresh`

Rotate refresh token and get a new access token.

**Headers:** none required (cookie is sent automatically by browser)

**Body (Expo only — optional if cookie present):**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

Cookie takes priority over body if both are present.

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

Also rotates the cookie with the new refresh token.

**Errors:** `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400)

---

#### `POST /api/auth/logout`

Revoke the current refresh token.

**Headers:** none required

**Body (Expo only — optional if cookie present):**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response `200`:**
```json
{
  "data": { "message": "Session closed successfully" }
}
```

Clears the `refreshToken` cookie.

**Errors:** `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400)

---

### Folders — `/api/folders`

> All endpoints require `Authorization: Bearer <accessToken>`

---

#### `GET /api/folders`

List root-level folders for the authenticated user.

**Headers:** `Authorization: Bearer <accessToken>`

**Response `200`:**
```json
{
  "data": [
    { "id": "uuid", "name": "Documents", "parentId": null, "createdAt": "2025-01-01T00:00:00Z" }
  ]
}
```

---

#### `GET /api/folders/:id`

Get folder contents (subfolders + files).

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `id` — folder UUID

**Response `200`:**
```json
{
  "data": {
    "folder": { "id": "uuid", "name": "Documents", "parentId": null, "createdAt": "..." },
    "subfolders": [
      { "id": "uuid", "name": "Work", "parentId": "uuid", "createdAt": "..." }
    ],
    "files": [
      { "id": "uuid", "name": "report.pdf", "mimeType": "application/pdf", "size": 204800, "checksum": "abc123", "folderId": "uuid", "uploadedBy": "uuid", "createdAt": "...", "deletedAt": null }
    ]
  }
}
```

**Errors:** `FOLDER_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

#### `GET /api/folders/:id/breadcrumb`

Get the full path from root to the given folder.

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `id` — folder UUID

**Response `200`:**
```json
{
  "data": [
    { "id": "uuid", "name": "Root", "parentId": null },
    { "id": "uuid", "name": "Documents", "parentId": "uuid" },
    { "id": "uuid", "name": "Work", "parentId": "uuid" }
  ]
}
```

**Errors:** `FOLDER_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

#### `POST /api/folders`

Create a new folder.

**Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`

**Body:**
```json
{
  "name": "New Folder",
  "parentId": "uuid-or-null"
}
```

`parentId` is optional — defaults to `null` (root).

**Response `201`:**
```json
{
  "data": { "id": "uuid", "name": "New Folder", "parentId": null, "createdAt": "..." }
}
```

**Errors:** `FOLDER_NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_ERROR` (400)

---

#### `PATCH /api/folders/:id`

Rename a folder.

**Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`

**Params:** `id` — folder UUID

**Body:**
```json
{ "name": "Renamed Folder" }
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "name": "Renamed Folder", "parentId": null, "createdAt": "..." }
}
```

**Errors:** `FOLDER_NOT_FOUND` (404), `FORBIDDEN` (403), `CONFLICT` (409), `VALIDATION_ERROR` (400)

---

#### `DELETE /api/folders/:id`

Delete a folder.

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `id` — folder UUID

**Query params:**
- `recursive=true` — required to delete non-empty folders (deletes all files from disk and DB)

**Response `204`:** no body

**Errors:** `FOLDER_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

### Files — `/api/files`

> All endpoints require `Authorization: Bearer <accessToken>`

---

#### `POST /api/files/upload`

Upload a file.

**Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: multipart/form-data`

**Query params:** `folderId` (UUID, required)

**Form field:** `file` — the file binary

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "photo.jpg",
    "mimeType": "image/jpeg",
    "size": 1048576,
    "checksum": "sha256hex",
    "folderId": "uuid",
    "uploadedBy": "uuid",
    "createdAt": "...",
    "deletedAt": null
  }
}
```

**Errors:** `NO_FILE` (400), `FILE_TOO_LARGE` (413), `FOLDER_NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_ERROR` (400)

---

#### `GET /api/files`

List files in a folder.

**Headers:** `Authorization: Bearer <accessToken>`

**Query params:** `folderId` (UUID, required)

**Response `200`:**
```json
{
  "data": [
    { "id": "uuid", "name": "photo.jpg", "mimeType": "image/jpeg", "size": 1048576, "checksum": "sha256hex", "folderId": "uuid", "uploadedBy": "uuid", "createdAt": "...", "deletedAt": null }
  ]
}
```

**Errors:** `VALIDATION_ERROR` (400)

---

#### `GET /api/files/:id`

Get file metadata.

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `id` — file UUID

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "report.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "checksum": "sha256hex",
    "folderId": "uuid",
    "uploadedBy": "uuid",
    "createdAt": "...",
    "deletedAt": null
  }
}
```

**Errors:** `FILE_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

#### `GET /api/files/:id/download`

Download a file. Supports HTTP Range requests for partial content (video/audio streaming).

**Headers:**
- `Authorization: Bearer <accessToken>`
- `Range: bytes=0-1023` (optional — for partial content)

**Params:** `id` — file UUID

**Response `200` (full file):**
```
Content-Type: <mime-type>
Content-Disposition: attachment; filename*=UTF-8''<filename>
Content-Length: <bytes>
Accept-Ranges: bytes

<binary stream>
```

**Response `206` (range request):**
```
Content-Type: <mime-type>
Content-Range: bytes 0-1023/204800
Content-Length: 1024

<binary stream>
```

**Errors:** `FILE_NOT_FOUND` (404), `FORBIDDEN` (403), `STREAM_ERROR` (500), `VALIDATION_ERROR` (400)

---

#### `DELETE /api/files/:id`

Delete a file from disk and database (hard delete).

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `id` — file UUID

**Response `204`:** no body

**Errors:** `FILE_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

#### `POST /api/files/:id/share`

Create a one-time share token for a file (expires in 8 hours).

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `id` — file UUID

**Response `201`:**
```json
{
  "data": {
    "token": "uuid",
    "expiresAt": "2025-01-01T08:00:00Z"
  }
}
```

**Errors:** `FILE_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

#### `GET /api/files/:id/share`

List active share tokens for a file.

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `id` — file UUID

**Response `200`:**
```json
{
  "data": [
    { "id": "uuid", "expiresAt": "2025-01-01T08:00:00Z", "createdAt": "2025-01-01T00:00:00Z" }
  ]
}
```

**Errors:** `FILE_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

#### `DELETE /api/files/share/:tokenId`

Revoke a share token.

**Headers:** `Authorization: Bearer <accessToken>`

**Params:** `tokenId` — share token UUID

**Response `204`:** no body

**Errors:** `SHARE_TOKEN_NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

---

### Share público — `/api/share`

> No authentication required.

---

#### `GET /api/share/:token`

Download a file using a one-time share token. Token is consumed on first use.

**Params:** `token` — share token UUID

**Headers:** `Range: bytes=0-1023` (optional)

**Response `200` / `206`:** binary stream (same headers as authenticated download)

**Errors:** `SHARE_TOKEN_NOT_FOUND` (404), `SHARE_TOKEN_USED` (403), `SHARE_TOKEN_EXPIRED` (403), `STREAM_ERROR` (500), `VALIDATION_ERROR` (400)

---

### Audit — `/api/audit`

> Pending — Fase 8

`GET /api/audit/` — returns `501 Not Implemented`.

---

## Database schema

```sql
users             (id, email, password_hash, role, refresh_token_hash, created_at)
folders           (id, name, parent_id → folders(id) CASCADE, owner_id → users(id), created_at)
files             (id, name, mime_type, size, checksum, storage_path, folder_id → folders(id), uploaded_by → users(id), deleted_at, created_at)
file_share_tokens (id, file_id → files(id), created_by → users(id), expires_at, used_at, created_at)
```

Storage path on disk: `{STORAGE_PATH}/{userId}/{folderId}/{uuid}.{ext}`
