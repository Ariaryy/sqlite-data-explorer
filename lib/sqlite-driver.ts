import type { QueryResultRow } from "@/lib/types"

const SQLITE_BUSY_TIMEOUT_MS = 5_000

type SqliteRow = QueryResultRow

export type SqliteStatement = {
  all(...params: unknown[]): SqliteRow[]
  get(...params: unknown[]): SqliteRow | undefined
  iterate(...params: unknown[]): Iterable<SqliteRow>
  run(...params: unknown[]): unknown
  columns(): string[]
}

export type SqliteDatabase = {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
  close(): void
}

type BunStatementLike = {
  all(...params: unknown[]): SqliteRow[]
  get(...params: unknown[]): SqliteRow | undefined
  iterate(...params: unknown[]): Iterable<SqliteRow>
  run(...params: unknown[]): unknown
  columnNames: string[]
}

type BunDatabaseLike = {
  exec(sql: string): void
  prepare(sql: string): BunStatementLike
  close(): void
}

type BunDatabaseConstructor = new (
  dbPath: string,
  options?: { readonly?: boolean }
) => BunDatabaseLike

let bunDatabasePromise: Promise<BunDatabaseConstructor> | undefined

async function loadBunDatabase() {
  if (!("Bun" in globalThis)) {
    throw new Error("SQLite access requires the Bun runtime.")
  }

  bunDatabasePromise ??= import("bun:sqlite").then(
    (module) => module.Database as BunDatabaseConstructor
  )

  return bunDatabasePromise
}

function wrapStatement(statement: BunStatementLike): SqliteStatement {
  return {
    all: (...params) => statement.all(...params),
    get: (...params) => statement.get(...params),
    iterate: (...params) => statement.iterate(...params),
    run: (...params) => statement.run(...params),
    columns: () => [...statement.columnNames],
  }
}

function configureDatabase(db: SqliteDatabase, readonly: boolean) {
  db.exec(`PRAGMA busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`)

  if (readonly) {
    try {
      db.exec("PRAGMA query_only = 1")
    } catch {
      // Read-only mode already blocks writes if this pragma is unavailable.
    }
  }

  return db
}

async function openDatabase(dbPath: string, readonly = false): Promise<SqliteDatabase> {
  const BunDatabase = await loadBunDatabase()
  const db = new BunDatabase(dbPath, readonly ? { readonly: true } : undefined)

  return configureDatabase(
    {
      exec: (sql) => db.exec(sql),
      prepare: (sql) => wrapStatement(db.prepare(sql)),
      close: () => db.close(),
    },
    readonly
  )
}

export async function openSqliteDatabase(dbPath: string) {
  return openDatabase(dbPath)
}

export async function openReadonlySqliteDatabase(dbPath: string) {
  return openDatabase(dbPath, true)
}
