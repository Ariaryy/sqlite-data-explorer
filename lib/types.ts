export type TableInfo = {
  name: string
}

export type SchemaColumn = {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: unknown
  pk: number
}

export type QueryResultRow = Record<string, unknown>

export type QueryResult = {
  columns: string[]
  rows: QueryResultRow[]
  rowCount: number
  truncated: boolean
  limit: number
}

export type UploadSession = {
  sessionId: string
  fileName: string
  size: number
}

export type ApiSuccess<T> = {
  ok: true
  data: T
}

export type ApiFailure = {
  ok: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
