import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "bun:test"

import {
  handleQueryRequest,
  handleSchemaRequest,
  handleTablesRequest,
  handleUploadRequest,
} from "@/lib/api-handlers"
import { SESSIONS_DIR } from "@/lib/session-store"
import { createTestDatabase } from "@/tests/helpers"

async function parseJson(response: Response) {
  return response.json()
}

afterEach(async () => {
  await fs.rm(SESSIONS_DIR, { recursive: true, force: true })
})

describe("api handlers", () => {
  it("uploads a sqlite file and returns a session", async () => {
    const fixture = await createTestDatabase()

    try {
      const fileBuffer = await fs.readFile(fixture.dbPath)
      const formData = new FormData()
      formData.append("file", new File([fileBuffer], "fixture.sqlite"))

      const response = await handleUploadRequest(
        new Request("http://localhost/api/upload", {
          method: "POST",
          body: formData,
        })
      )
      const payload = await parseJson(response)

      expect(response.status).toBe(201)
      expect(payload.ok).toBe(true)
      expect(payload.data.fileName).toBe("fixture.sqlite")
      expect(payload.data.sessionId).toBeTruthy()
    } finally {
      await fixture.cleanup()
    }
  })

  it("returns tables, schema, and query results for a valid session", async () => {
    const fixture = await createTestDatabase()

    try {
      const fileBuffer = await fs.readFile(fixture.dbPath)
      const formData = new FormData()
      formData.append("file", new File([fileBuffer], "fixture.sqlite"))

      const uploadResponse = await handleUploadRequest(
        new Request("http://localhost/api/upload", {
          method: "POST",
          body: formData,
        })
      )
      const uploadPayload = await parseJson(uploadResponse)
      const sessionId = uploadPayload.data.sessionId

      const tablesResponse = await handleTablesRequest(
        new Request(`http://localhost/api/tables?sessionId=${sessionId}`)
      )
      const tablesPayload = await parseJson(tablesResponse)

      expect(tablesPayload.data.tables).toEqual([{ name: "users" }])

      const schemaResponse = await handleSchemaRequest(
        new Request(
          `http://localhost/api/schema?sessionId=${sessionId}&tableName=users`
        )
      )
      const schemaPayload = await parseJson(schemaResponse)

      expect(schemaPayload.data.schema[0].name).toBe("id")

      const queryResponse = await handleQueryRequest(
        new Request("http://localhost/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            query: "SELECT name FROM users ORDER BY id",
          }),
        })
      )
      const queryPayload = await parseJson(queryResponse)

      expect(queryPayload.data.result.rows).toEqual([
        { name: "Ada" },
        { name: "Grace" },
      ])
    } finally {
      await fixture.cleanup()
    }
  })

  it("rejects blocked queries", async () => {
    const response = await handleQueryRequest(
      new Request("http://localhost/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: "0f94bcfe-750f-4470-a39a-0fc9ec512e8d",
          query: "DROP TABLE users",
        }),
      })
    )
    const payload = await parseJson(response)

    expect(response.status).toBe(400)
    expect(payload.ok).toBe(false)
  })
})
