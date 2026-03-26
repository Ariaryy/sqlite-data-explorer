"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { QueryPanel } from "@/components/explorer/query-panel"
import { ResultsPanel } from "@/components/explorer/results-panel"
import { SchemaPanel } from "@/components/explorer/schema-panel"
import { TablesPanel } from "@/components/explorer/tables-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { readJson } from "@/lib/api-client"
import type { QueryResult, SchemaColumn, TableInfo } from "@/lib/types"
import { cn } from "@/lib/utils"

const DEFAULT_QUERY =
  "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"

type ExplorerTab = "schema" | "query" | "results"

function formatFileSize(size: number) {
  if (size <= 0) {
    return "Unknown size"
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

type SQLiteWorkspaceProps = {
  fileName?: string
  sessionId?: string
  size?: string
}

export function SQLiteWorkspace({
  fileName: fileNameParam,
  sessionId: sessionIdParam,
  size,
}: SQLiteWorkspaceProps) {
  const sessionId = sessionIdParam?.trim() ?? ""
  const fileName = fileNameParam?.trim() || "Uploaded database"
  const rawFileSize = Number(size ?? 0)
  const fileSize = Number.isFinite(rawFileSize) ? rawFileSize : 0

  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState("")
  const [schema, setSchema] = useState<SchemaColumn[]>([])
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [results, setResults] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ExplorerTab>("schema")
  const [loadingTables, setLoadingTables] = useState(false)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [runningQuery, setRunningQuery] = useState(false)

  useEffect(() => {
    setTables([])
    setSelectedTable("")
    setSchema([])
    setResults(null)
    setError(null)
    setActiveTab("schema")
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let cancelled = false

    async function loadTables() {
      setLoadingTables(true)

      try {
        setError(null)
        const data = await readJson<{ tables: TableInfo[] }>(
          await fetch(`/api/tables?sessionId=${sessionId}`, {
            cache: "no-store",
          })
        )

        if (cancelled) {
          return
        }

        setTables(data.tables)

        if (data.tables[0]) {
          setSelectedTable(data.tables[0].name)
        } else {
          setSelectedTable("")
          setSchema([])
        }
      } catch (requestError) {
        if (cancelled) {
          return
        }

        setTables([])
        setSchema([])
        setSelectedTable("")
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load tables."
        )
      } finally {
        if (!cancelled) {
          setLoadingTables(false)
        }
      }
    }

    void loadTables()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId || !selectedTable) {
      setSchema([])
      return
    }

    let cancelled = false

    async function loadSchema() {
      setLoadingSchema(true)

      try {
        setError(null)
        const data = await readJson<{ schema: SchemaColumn[] }>(
          await fetch(
            `/api/schema?sessionId=${sessionId}&tableName=${encodeURIComponent(selectedTable)}`,
            { cache: "no-store" }
          )
        )

        if (cancelled) {
          return
        }

        setSchema(data.schema)
      } catch (requestError) {
        if (cancelled) {
          return
        }

        setSchema([])
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load schema."
        )
      } finally {
        if (!cancelled) {
          setLoadingSchema(false)
        }
      }
    }

    void loadSchema()

    return () => {
      cancelled = true
    }
  }, [selectedTable, sessionId])

  async function runQuery() {
    if (!sessionId) {
      setError("Upload a database before running a query.")
      return
    }

    setActiveTab("results")
    setRunningQuery(true)

    try {
      setError(null)
      const data = await readJson<{ result: QueryResult }>(
        await fetch("/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            query,
          }),
        })
      )

      setResults(data.result)
    } catch (queryError) {
      setResults(null)
      setError(
        queryError instanceof Error ? queryError.message : "Query failed."
      )
    } finally {
      setRunningQuery(false)
    }
  }

  if (!sessionId) {
    return (
      <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.16),transparent_24%),linear-gradient(180deg,rgba(245,248,242,0.98),rgba(240,246,239,1))] px-4 py-8 text-foreground sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.2),transparent_26%),linear-gradient(180deg,rgba(18,22,18,1),rgba(11,15,12,1))]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <section className="rounded-[28px] border border-foreground/10 bg-background/[0.9] p-6 shadow-[0_24px_120px_-48px_rgba(27,35,27,0.6)] backdrop-blur sm:p-8">
            <Badge className="rounded-full bg-primary/[0.12] px-3 py-1 text-[11px] tracking-[0.28em] text-primary uppercase hover:bg-primary/[0.12]">
              Explorer workspace
            </Badge>
            <div className="mt-5 space-y-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                No active database session.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Upload a SQLite file from the home page to open the schema and
                query workspace.
              </p>
            </div>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "mt-6 w-fit"
              )}
            >
              Return home
            </Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.16),transparent_24%),linear-gradient(180deg,rgba(245,248,242,0.98),rgba(240,246,239,1))] px-4 py-8 text-foreground sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.2),transparent_26%),linear-gradient(180deg,rgba(18,22,18,1),rgba(11,15,12,1))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-6 rounded-[28px] border border-foreground/10 bg-background/[0.9] p-6 shadow-[0_24px_120px_-48px_rgba(27,35,27,0.6)] backdrop-blur sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-5">
            <Badge className="rounded-full bg-primary/[0.12] px-3 py-1 text-[11px] tracking-[0.28em] text-primary uppercase hover:bg-primary/[0.12]">
              Explorer workspace
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Explore {fileName} in a read-only session.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Browse tables, inspect schema, and run guarded SQL without
                leaving the uploaded database writable.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
              <span>Session {sessionId.slice(0, 8)}...</span>
              <span>{formatFileSize(fileSize)}</span>
              <span>Read-only connection</span>
            </div>
          </div>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Upload another database
          </Link>
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <TablesPanel
            loadingTables={loadingTables}
            selectedTable={selectedTable}
            tables={tables}
            onSelectTable={setSelectedTable}
          />

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ExplorerTab)}
            className="gap-4"
          >
            <TabsList className="rounded-full bg-background/[0.8] p-1">
              <TabsTrigger value="schema" className="rounded-full px-4">
                Schema
              </TabsTrigger>
              <TabsTrigger value="query" className="rounded-full px-4">
                Query editor
              </TabsTrigger>
              <TabsTrigger value="results" className="rounded-full px-4">
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schema">
              <SchemaPanel
                loadingSchema={loadingSchema}
                schema={schema}
                selectedTable={selectedTable}
              />
            </TabsContent>

            <TabsContent value="query">
              <QueryPanel
                disabled={!sessionId}
                query={query}
                runningQuery={runningQuery}
                onQueryChange={setQuery}
                onRunQuery={runQuery}
              />
            </TabsContent>

            <TabsContent value="results">
              <ResultsPanel results={results} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  )
}
