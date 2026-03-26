import { randomUUID } from "node:crypto"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { openSqliteDatabase } from "@/lib/sqlite-driver"

export async function createTestDatabase() {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "sqlite-explorer-test-")
  )
  const dbPath = path.join(directory, `${randomUUID()}.sqlite`)
  const db = await openSqliteDatabase(dbPath)

  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE
    );

    INSERT INTO users (name, email)
    VALUES
      ('Ada', 'ada@example.com'),
      ('Grace', 'grace@example.com');
  `)
  db.close()

  return {
    dbPath,
    cleanup: async () => {
      await fs.rm(directory, { recursive: true, force: true })
    },
  }
}
