import Database from "better-sqlite3"

import { validateQuery } from "@/lib/query-validation"
import type {
  QueryResult,
  QueryResultRow,
  SchemaColumn,
  TableInfo,
} from "@/lib/types"

const MAX_RESULT_ROWS = 200

function withReadonlyDatabase<T>(
  dbPath: string,
  operation: (db: Database.Database) => T
) {
  const db = new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
    timeout: 5_000,
  })

  db.pragma("query_only = 1")

  try {
    return operation(db)
  } finally {
    db.close()
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function normalizeValue(value: unknown) {
  if (Buffer.isBuffer(value)) {
    return `[blob ${value.byteLength} bytes]`
  }

  if (typeof value === "bigint") {
    return value.toString()
  }

  return value
}

function normalizeRow(row: QueryResultRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeValue(value)])
  )
}

export function getTables(dbPath: string): TableInfo[] {
  return withReadonlyDatabase(dbPath, (db) =>
    db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name COLLATE NOCASE
        `
      )
      .all() as TableInfo[]
  )
}

export function getSchema(dbPath: string, tableName: string): SchemaColumn[] {
  return withReadonlyDatabase(dbPath, (db) => {
    const table = db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = ?
        `
      )
      .get(tableName) as TableInfo | undefined

    if (!table) {
      throw new Error("Table not found.")
    }

    return db
      .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
      .all() as SchemaColumn[]
  })
}

export function executeQuery(dbPath: string, query: string): QueryResult {
  const validation = validateQuery(query)

  if (!validation.valid) {
    throw new Error(validation.error)
  }

  return withReadonlyDatabase(dbPath, (db) => {
    const statement = db.prepare(validation.normalizedQuery)

    if (!statement.reader) {
      throw new Error("Only read-only queries are allowed.")
    }

    const columns = statement.columns().map((column) => column.name)
    const iterator = statement.iterate() as IterableIterator<QueryResultRow>
    const rows: QueryResultRow[] = []
    let truncated = false

    for (const row of iterator) {
      if (rows.length >= MAX_RESULT_ROWS) {
        truncated = true
        break
      }

      rows.push(normalizeRow(row))
    }

    return {
      columns,
      rows,
      rowCount: rows.length,
      truncated,
      limit: MAX_RESULT_ROWS,
    }
  })
}

export { MAX_RESULT_ROWS }
