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
  options?: { readonly?: boolean; readOnly?: boolean }
) => NodeDatabaseLike

type SqliteFactory = (dbPath: string, readonly?: boolean) => SqliteDatabase

let sqliteFactoryPromise: Promise<SqliteFactory> | undefined

async function importBunSqlite() {
  return import("bun:sqlite") as Promise<{ Database: BunDatabaseConstructor }>
}

async function importNodeSqlite() {
  return import("node:sqlite") as Promise<{
    DatabaseSync: NodeDatabaseConstructor
  }>
}

function wrapBunStatement(statement: BunStatementLike): SqliteStatement {
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
      // Read-only open mode already blocks writes if the pragma isn't available.
    }
  }

  return db
}

async function loadSqliteFactory(): Promise<SqliteFactory> {
  if ("Bun" in globalThis) {
    const { Database } = await importBunSqlite()

    return (dbPath: string, readonly = false) => {
      const db = new Database(dbPath, readonly ? { readonly: true } : undefined)

      return configureDatabase(
        {
          exec: (sql) => db.exec(sql),
          prepare: (sql) => wrapBunStatement(db.prepare(sql)),
          close: () => db.close(),
        },
        readonly
      )
    }
  }

  const { DatabaseSync } = await importNodeSqlite()

  return (dbPath: string, readonly = false) => {
    const db = new DatabaseSync(dbPath, readonly ? { readonly: true } : {})

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

async function getSqliteFactory(): Promise<SqliteFactory> {
  sqliteFactoryPromise ??= loadSqliteFactory()
  return sqliteFactoryPromise
}

export async function openSqliteDatabase(dbPath: string) {
  const factory = await getSqliteFactory()
  return factory(dbPath)
}

export async function openReadonlySqliteDatabase(dbPath: string) {
  const factory = await getSqliteFactory()
  return factory(dbPath, true)
}
