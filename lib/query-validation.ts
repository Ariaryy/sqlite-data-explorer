const MAX_QUERY_LENGTH = 5_000

const DISALLOWED_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "create",
  "replace",
  "truncate",
  "attach",
  "detach",
  "vacuum",
  "reindex",
  "analyze",
  "pragma",
  "begin",
  "commit",
  "rollback",
  "savepoint",
  "release",
]

export type QueryValidationResult =
  | { valid: true; normalizedQuery: string }
  | { valid: false; error: string }

function stripQuotedSection(
  source: string,
  index: number,
  quote: string,
  supportsDoubleEscape: boolean
) {
  let cursor = index + 1

  while (cursor < source.length) {
    const character = source[cursor]

    if (character === quote) {
      const nextCharacter = source[cursor + 1]

      if (supportsDoubleEscape && nextCharacter === quote) {
        cursor += 2
        continue
      }

      cursor += 1
      break
    }

    cursor += 1
  }

  return cursor
}

export function stripSqlForAnalysis(source: string) {
  let result = ""
  let index = 0

  while (index < source.length) {
    const character = source[index]
    const nextCharacter = source[index + 1]

    if (character === "-" && nextCharacter === "-") {
      index += 2

      while (index < source.length && source[index] !== "\n") {
        index += 1
      }

      result += " "
      continue
    }

    if (character === "/" && nextCharacter === "*") {
      index += 2

      while (index < source.length) {
        if (source[index] === "*" && source[index + 1] === "/") {
          index += 2
          break
        }

        index += 1
      }

      result += " "
      continue
    }

    if (character === "'" || character === '"' || character === "`") {
      index = stripQuotedSection(source, index, character, true)
      result += " "
      continue
    }

    if (character === "[") {
      index += 1

      while (index < source.length && source[index] !== "]") {
        index += 1
      }

      if (source[index] === "]") {
        index += 1
      }

      result += " "
      continue
    }

    result += character
    index += 1
  }

  return result
}

export function validateQuery(query: string): QueryValidationResult {
  const normalizedQuery = query.trim().replace(/;+\s*$/, "")

  if (!normalizedQuery) {
    return { valid: false, error: "Query cannot be empty." }
  }

  if (normalizedQuery.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query exceeds the ${MAX_QUERY_LENGTH} character limit.`,
    }
  }

  const stripped = stripSqlForAnalysis(query)
  const strippedWithoutTrailingSemicolon = stripped.trim().replace(/;+\s*$/, "")
  const semicolonMatches = strippedWithoutTrailingSemicolon.match(/;/g) ?? []

  if (semicolonMatches.length > 0) {
    return {
      valid: false,
      error: "Only a single SQL statement is allowed.",
    }
  }

  if (
    !/^(select|with|explain\s+query\s+plan\s+select|explain\s+select)\b/i.test(
      strippedWithoutTrailingSemicolon
    )
  ) {
    return {
      valid: false,
      error: "Only read-only SELECT queries are allowed.",
    }
  }

  for (const keyword of DISALLOWED_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i")

    if (pattern.test(strippedWithoutTrailingSemicolon)) {
      return {
        valid: false,
        error: `Blocked keyword detected: ${keyword.toUpperCase()}.`,
      }
    }
  }

  if (/\b(load_extension|writefile|readfile)\b/i.test(strippedWithoutTrailingSemicolon)) {
    return {
      valid: false,
      error: "The query uses a blocked SQLite function.",
    }
  }

  return { valid: true, normalizedQuery }
}

export { MAX_QUERY_LENGTH }
