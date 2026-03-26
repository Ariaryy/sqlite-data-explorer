import { describe, expect, it } from "vitest"

import { stripSqlForAnalysis, validateQuery } from "@/lib/query-validation"

describe("validateQuery", () => {
  it("allows basic select statements", () => {
    expect(validateQuery("SELECT * FROM users")).toEqual({
      valid: true,
      normalizedQuery: "SELECT * FROM users",
    })
  })

  it("rejects write statements", () => {
    expect(validateQuery("DELETE FROM users")).toEqual({
      valid: false,
      error: "Only read-only SELECT queries are allowed.",
    })
  })

  it("rejects blocked keywords inside a cte", () => {
    const result = validateQuery(
      "WITH sample AS (SELECT 1) UPDATE users SET name = 'x'"
    )

    expect(result.valid).toBe(false)
    expect(result).toMatchObject({
      error: "Blocked keyword detected: UPDATE.",
    })
  })

  it("rejects multi-statement input", () => {
    expect(validateQuery("SELECT 1; SELECT 2")).toEqual({
      valid: false,
      error: "Only a single SQL statement is allowed.",
    })
  })

  it("ignores semicolons inside comments and strings", () => {
    expect(stripSqlForAnalysis("SELECT ';' -- hidden;\nFROM users")).not.toContain(
      ";"
    )
    expect(validateQuery("SELECT ';' AS token -- ok;\nFROM users")).toEqual({
      valid: true,
      normalizedQuery: "SELECT ';' AS token -- ok;\nFROM users",
    })
  })
})
