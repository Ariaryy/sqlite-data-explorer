import { validateQuery } from "@/lib/query-validation"
import {
  openReadonlySqliteDatabase,
  type SqliteDatabase,
} from "@/lib/sqlite-driver"
import type {
  QueryResult,
  QueryResultRow,
  SchemaColumn,
  TableInfo,
} from "@/lib/types"

const MAX_RESULT_ROWS = 200

async function withReadonlyDatabase<T>(
  dbPath: string,
  operation: (db: SqliteDatabase) => T
) {
  const db = await openReadonlySqliteDatabase(dbPath)

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
  if (value instanceof Uint8Array) {
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

export async function getTables(dbPath: string): Promise<TableInfo[]> {
  return withReadonlyDatabase(
    dbPath,
    (db) =>
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

export async function getSchema(
  dbPath: string,
  tableName: string
): Promise<SchemaColumn[]> {
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

export async function executeQuery(
  dbPath: string,
  query: string
): Promise<QueryResult> {
  const validation = validateQuery(query)

  if (!validation.valid) {
    throw new Error(validation.error)
  }

  return withReadonlyDatabase(dbPath, (db) => {
    const statement = db.prepare(validation.normalizedQuery)
    let columns = statement.columns()

    if (columns.length === 0) {
      const previewRow = statement.get()

      if (previewRow) {
        columns = Object.keys(previewRow)
      }
    }

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
