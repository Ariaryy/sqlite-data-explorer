import { NextResponse } from "next/server"
import { z } from "zod"

import { createUploadSession, resolveSessionDbPath } from "@/lib/session-store"
import { executeQuery, getSchema, getTables } from "@/lib/sqlite"
import type {
  ApiFailure,
  ApiSuccess,
  QueryResult,
  SchemaColumn,
  TableInfo,
  UploadSession,
} from "@/lib/types"

const sessionQuerySchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
})

const schemaQuerySchema = sessionQuerySchema.extend({
  tableName: z.string().min(1, "Table name is required."),
})

const queryBodySchema = sessionQuerySchema.extend({
  query: z.string().min(1, "Query is required."),
})

function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status })
}

function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json<ApiFailure>(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status }
  )
}

function parseRequestUrl(request: Request) {
  return new URL(request.url)
}

export async function handleUploadRequest(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return jsonError("A database file is required.", 400, "INVALID_FILE")
    }

    const session = await createUploadSession(file)
    return jsonSuccess<UploadSession>(session, 201)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload database."

    return jsonError(message, 400, "UPLOAD_FAILED")
  }
}

export async function handleTablesRequest(request: Request) {
  try {
    const params = sessionQuerySchema.parse(
      Object.fromEntries(parseRequestUrl(request).searchParams.entries())
    )
    const dbPath = await resolveSessionDbPath(params.sessionId)
    const tables = await getTables(dbPath)

    return jsonSuccess<{ tables: TableInfo[] }>({ tables })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        error.issues[0]?.message ?? "Invalid request.",
        400,
        "INVALID_INPUT"
      )
    }

    const message =
      error instanceof Error ? error.message : "Failed to load tables."

    return jsonError(message, 400, "TABLES_FAILED")
  }
}

export async function handleSchemaRequest(request: Request) {
  try {
    const params = schemaQuerySchema.parse(
      Object.fromEntries(parseRequestUrl(request).searchParams.entries())
    )
    const dbPath = await resolveSessionDbPath(params.sessionId)
    const schema = await getSchema(dbPath, params.tableName)

    return jsonSuccess<{ schema: SchemaColumn[] }>({ schema })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        error.issues[0]?.message ?? "Invalid request.",
        400,
        "INVALID_INPUT"
      )
    }

    const message =
      error instanceof Error ? error.message : "Failed to load schema."

    return jsonError(message, 400, "SCHEMA_FAILED")
  }
}

export async function handleQueryRequest(request: Request) {
  try {
    const body = queryBodySchema.parse(await request.json())
    const dbPath = await resolveSessionDbPath(body.sessionId)
    const result = await executeQuery(dbPath, body.query)

    return jsonSuccess<{ result: QueryResult }>({ result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        error.issues[0]?.message ?? "Invalid request.",
        400,
        "INVALID_INPUT"
      )
    }

    const message =
      error instanceof Error ? error.message : "Failed to execute query."

    return jsonError(message, 400, "QUERY_FAILED")
  }
}
