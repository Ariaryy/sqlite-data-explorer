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

type NodeStatementLike = {
  all(...params: unknown[]): SqliteRow[]
  get(...params: unknown[]): SqliteRow | undefined
  iterate(...params: unknown[]): Iterable<SqliteRow>
  run(...params: unknown[]): unknown
}

type NodeDatabaseLike = {
  exec(sql: string): void
  prepare(sql: string): NodeStatementLike
  close(): void
}

type NodeDatabaseConstructor = new (
  dbPath: string,
  options?: { readOnly?: boolean; readonly?: boolean }
) => NodeDatabaseLike

type SqliteFactory = (dbPath: string, readonly?: boolean) => SqliteDatabase

let sqliteFactoryPromise: Promise<SqliteFactory> | undefined

async function loadBunFactory(): Promise<SqliteFactory> {
  const { Database } = (await import("bun:sqlite")) as {
    Database: BunDatabaseConstructor
  }

  return (dbPath: string, readonly = false) => {
    const db = new Database(dbPath, readonly ? { readonly: true } : undefined)

    return configureDatabase(
      {
        exec: (sql) => db.exec(sql),
        prepare: (sql) => wrapStatement(db.prepare(sql)),
        close: () => db.close(),
      },
      readonly
    )
  }
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

function wrapNodeStatement(statement: NodeStatementLike): SqliteStatement {
  return {
    all: (...params) => statement.all(...params),
    get: (...params) => statement.get(...params),
    iterate: (...params) => statement.iterate(...params),
    run: (...params) => statement.run(...params),
    columns: () => [],
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

async function loadNodeFactory(): Promise<SqliteFactory> {
  const { DatabaseSync } = (await import("node:sqlite")) as {
    DatabaseSync: NodeDatabaseConstructor
  }

  return (dbPath: string, readonly = false) => {
    const db = new DatabaseSync(dbPath, readonly ? { readOnly: true } : {})

    return configureDatabase(
      {
        exec: (sql) => db.exec(sql),
        prepare: (sql) => wrapNodeStatement(db.prepare(sql)),
        close: () => db.close(),
      },
      readonly
    )
  }
}

async function getSqliteFactory() {
  sqliteFactoryPromise ??= (async () => {
    try {
      return await loadBunFactory()
    } catch {
      try {
        return await loadNodeFactory()
      } catch {
        throw new Error(
          "SQLite access requires either Bun's sqlite runtime or Node's built-in sqlite module."
        )
      }
    }
  })()

  return sqliteFactoryPromise
}

async function openDatabase(
  dbPath: string,
  readonly = false
): Promise<SqliteDatabase> {
  const factory = await getSqliteFactory()
  return factory(dbPath, readonly)
}

export async function openSqliteDatabase(dbPath: string) {
  return openDatabase(dbPath)
}

export async function openReadonlySqliteDatabase(dbPath: string) {
  return openDatabase(dbPath, true)
}
