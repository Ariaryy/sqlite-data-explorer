import { randomUUID } from "node:crypto"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

const ACCEPTED_EXTENSIONS = new Set([".sqlite", ".db"])
const SQLITE_HEADER = Buffer.from("SQLite format 3\u0000")
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024
const SESSION_TTL_MS = 30 * 60 * 1000
const SESSIONS_DIR = path.join(os.tmpdir(), "sqlite-data-explorer")

function getExtension(fileName: string) {
  return path.extname(fileName).toLowerCase()
}

function isValidSessionId(sessionId: string) {
  return /^[a-f0-9-]{36}$/i.test(sessionId)
}

async function ensureSessionsDir() {
  await fs.mkdir(SESSIONS_DIR, { recursive: true })
}

function getSessionCandidates(sessionId: string) {
  return [...ACCEPTED_EXTENSIONS].map((extension) =>
    path.join(SESSIONS_DIR, `${sessionId}${extension}`)
  )
}

export async function cleanupExpiredSessions() {
  await ensureSessionsDir()

  const entries = await fs.readdir(SESSIONS_DIR)
  const cutoff = Date.now() - SESSION_TTL_MS

  await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(SESSIONS_DIR, entry)

      try {
        const stats = await fs.stat(filePath)

        if (stats.mtimeMs < cutoff) {
          await fs.unlink(filePath)
        }
      } catch {
        return
      }
    })
  )
}

export async function createUploadSession(file: File) {
  const extension = getExtension(file.name)

  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    throw new Error("Only .sqlite and .db files are supported.")
  }

  if (file.size === 0) {
    throw new Error("The uploaded file is empty.")
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`File exceeds the ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB limit.`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (
    buffer.length < SQLITE_HEADER.length ||
    !buffer.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)
  ) {
    throw new Error("The uploaded file is not a valid SQLite database.")
  }

  const sessionId = randomUUID()
  const dbPath = path.join(SESSIONS_DIR, `${sessionId}${extension}`)

  await ensureSessionsDir()
  await cleanupExpiredSessions()
  await fs.writeFile(dbPath, buffer)

  return {
    sessionId,
    fileName: file.name,
    size: file.size,
  }
}

export async function resolveSessionDbPath(sessionId: string) {
  if (!isValidSessionId(sessionId)) {
    throw new Error("Invalid session ID.")
  }

  await cleanupExpiredSessions()

  for (const candidate of getSessionCandidates(sessionId)) {
    try {
      await fs.access(candidate)
      const now = new Date()
      await fs.utimes(candidate, now, now)
      return candidate
    } catch {
      continue
    }
  }

  throw new Error("Session not found or expired. Upload the database again.")
}

export {
  ACCEPTED_EXTENSIONS,
  MAX_UPLOAD_SIZE,
  SESSION_TTL_MS,
  SESSIONS_DIR,
}
