# SQLite Data Explorer

A lightweight SQLite web explorer built with Next.js App Router, Bun, Tailwind CSS, and shadcn/ui.

The app lets you upload a `.sqlite` or `.db` file, open a temporary read-only session, inspect tables and schema, and run guarded SQL queries against the uploaded database.

## Features

- Upload SQLite database files (`.sqlite`, `.db`)
- Temporary session-based file handling
- Read-only SQLite access through Bun's native SQLite adapter
- Table listing and schema inspection
- Query editor for guarded SQL execution
- Results viewer with row limiting for large responses
- Structured API routes for upload, tables, schema, and queries
- Vitest unit coverage for query validation
- Bun integration tests for SQLite and API behavior
- Docker support
- GitHub Actions CI

## Stack

- Next.js 16 App Router
- Bun runtime
- Bun native SQLite adapter (`bun:sqlite`)
- React 19
- Tailwind CSS
- shadcn/ui
- Zod
- Vitest

## How It Works

1. A user uploads a SQLite file from the home page.
2. The backend validates the extension, size, and SQLite file signature.
3. The file is written to a temporary directory and a session ID is returned.
4. The explorer workspace loads tables and schema for that session.
5. Users can run read-only SQL queries against the uploaded database.
6. Results are capped to avoid oversized responses.

Uploaded databases are not meant for permanent storage. Sessions expire and temporary files are cleaned up automatically.

## Safety Model

The application is designed to block write access at multiple layers:

- Query validation rejects unsafe SQL before execution
- Only a single SQL statement is allowed
- Dangerous keywords such as `INSERT`, `UPDATE`, `DELETE`, `DROP`, and `ALTER` are blocked
- The database is opened in read-only mode
- `PRAGMA query_only = 1` is enabled for read-only sessions when available
- Uploaded files are stored only in a temporary directory

## Project Structure

```text
app/
  api/
    query/route.ts
    schema/route.ts
    tables/route.ts
    upload/route.ts
  explorer/page.tsx
  page.tsx

components/
  explorer/
  ui/
  upload-home.tsx

lib/
  api-client.ts
  api-handlers.ts
  query-validation.ts
  session-store.ts
  sqlite-driver.ts
  sqlite.ts
  types.ts

tests/
  api.bun.test.ts
  query-validation.test.ts
  sqlite.bun.test.ts
```

## API Endpoints

### `POST /api/upload`

Uploads a SQLite database and returns a temporary session reference.

Response shape:

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "fileName": "example.sqlite",
    "size": 12345
  }
}
```

### `GET /api/tables?sessionId=...`

Returns the list of available tables for the uploaded database session.

### `GET /api/schema?sessionId=...&tableName=...`

Returns `PRAGMA table_info(...)` output for the selected table.

### `POST /api/query`

Executes a validated read-only SQL query.

Request body:

```json
{
  "sessionId": "uuid",
  "query": "SELECT * FROM users"
}
```

## Local Development

This project should be run with Bun.

### 1. Install dependencies

```bash
bun install
```

### 2. Start the development server

```bash
bun run dev
```

### 3. Open the app

```text
http://localhost:3000
```

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run typecheck
bun run test
```

### Test split

The test suite is intentionally split by runtime:

- `bun run test:unit`
  - runs Vitest for pure unit logic
  - currently covers query validation
- `bun run test:integration`
  - runs Bun's test runner for Bun-native SQLite and API integration tests

This split exists because Bun-native SQLite tests cannot be executed reliably under Vitest's Node-oriented runner.

## Docker

Build the image:

```bash
docker build -t sqlite-data-explorer .
```

Run the container:

```bash
docker run -p 3000:3000 sqlite-data-explorer
```

## CI

GitHub Actions is configured in `.github/workflows/ci.yml`.

The pipeline runs:

- dependency installation
- linting
- type-checking
- tests
- production build

## Notes

- The app is Bun-runtime oriented because the SQLite layer uses `bun:sqlite`.
- If you run checks in CI or another environment, use Bun consistently.
- Temporary database files should be treated as ephemeral session data, not durable storage.
