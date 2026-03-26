import { describe, expect, it } from "vitest"

import { executeQuery, getSchema, getTables } from "@/lib/sqlite"
import { createTestDatabase } from "@/tests/helpers"

describe("sqlite helpers", () => {
  it("lists tables from the database", async () => {
    const fixture = await createTestDatabase()

    try {
      expect(getTables(fixture.dbPath)).toEqual([{ name: "users" }])
    } finally {
      await fixture.cleanup()
    }
  })

  it("returns schema information", async () => {
    const fixture = await createTestDatabase()

    try {
      const schema = getSchema(fixture.dbPath, "users")

      expect(schema[0]).toMatchObject({
        name: "id",
        pk: 1,
      })
      expect(schema[1]).toMatchObject({
        name: "name",
      })
    } finally {
      await fixture.cleanup()
    }
  })

  it("executes read-only queries and truncates large results", async () => {
    const fixture = await createTestDatabase()

    try {
      const result = executeQuery(
        fixture.dbPath,
        `
          WITH RECURSIVE numbers(value) AS (
            SELECT 1
            UNION ALL
            SELECT value + 1 FROM numbers WHERE value < 220
          )
          SELECT value FROM numbers
        `
      )

      expect(result.columns).toEqual(["value"])
      expect(result.rows).toHaveLength(200)
      expect(result.truncated).toBe(true)
    } finally {
      await fixture.cleanup()
    }
  })
})
