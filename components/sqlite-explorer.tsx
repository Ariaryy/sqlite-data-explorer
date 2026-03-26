"use client"

import type { ChangeEvent } from "react"
import { useEffect, useState, useTransition } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type {
  ApiResponse,
  QueryResult,
  SchemaColumn,
  TableInfo,
  UploadSession,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const DEFAULT_QUERY =
  "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Request failed." : payload.error.message)
  }

  return payload.data
}

type UploadState = UploadSession | null

export function SQLiteExplorer() {
  const [session, setSession] = useState<UploadState>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState("")
  const [schema, setSchema] = useState<SchemaColumn[]>([])
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [results, setResults] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loadingTables, startLoadingTables] = useTransition()
  const [loadingSchema, startLoadingSchema] = useTransition()
  const [runningQuery, startRunningQuery] = useTransition()

  useEffect(() => {
    if (!session) {
      return
    }

    startLoadingTables(async () => {
      try {
        setError(null)
        const data = await readJson<{ tables: TableInfo[] }>(
          await fetch(`/api/tables?sessionId=${session.sessionId}`, {
            cache: "no-store",
          })
        )

        setTables(data.tables)

        if (data.tables[0]) {
          setSelectedTable(data.tables[0].name)
        } else {
          setSelectedTable("")
          setSchema([])
        }
      } catch (requestError) {
        setTables([])
        setSchema([])
        setSelectedTable("")
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load tables."
        )
      }
    })
  }, [session])

  useEffect(() => {
    if (!session || !selectedTable) {
      return
    }

    startLoadingSchema(async () => {
      try {
        setError(null)
        const data = await readJson<{ schema: SchemaColumn[] }>(
          await fetch(
            `/api/schema?sessionId=${session.sessionId}&tableName=${encodeURIComponent(selectedTable)}`,
            { cache: "no-store" }
          )
        )

        setSchema(data.schema)
      } catch (requestError) {
        setSchema([])
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load schema."
        )
      }
    })
  }, [selectedTable, session])

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    setError(null)
    setResults(null)
    setSchema([])
    setTables([])
    setSelectedTable("")

    try {
      const data = await readJson<UploadSession>(
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
      )

      setSession(data)
    } catch (uploadError) {
      setSession(null)
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  function runQuery() {
    if (!session) {
      setError("Upload a database before running a query.")
      return
    }

    startRunningQuery(async () => {
      try {
        setError(null)
        const data = await readJson<{ result: QueryResult }>(
          await fetch("/api/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: session.sessionId,
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
      }
    })
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.16),transparent_24%),linear-gradient(180deg,rgba(245,248,242,0.98),rgba(240,246,239,1))] px-4 py-8 text-foreground sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.2),transparent_26%),linear-gradient(180deg,rgba(18,22,18,1),rgba(11,15,12,1))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-5 rounded-[28px] border border-foreground/10 bg-background/[0.9] p-6 shadow-[0_24px_120px_-48px_rgba(27,35,27,0.6)] backdrop-blur sm:p-8 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="space-y-5">
            <Badge className="rounded-full bg-primary/[0.12] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-primary hover:bg-primary/[0.12]">
              SQLite field station
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Inspect SQLite files without ever granting write access.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Upload a temporary database, browse tables, inspect schema, and
                run guarded read-only SQL. Sessions expire automatically.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span>Temporary storage only</span>
              <span>Single statement queries</span>
              <span>200 row result cap</span>
            </div>
          </div>
          <Card className="border border-foreground/10 bg-card/[0.8] py-0">
            <CardHeader className="gap-2 border-b border-border/70 py-5">
              <CardTitle>Upload database</CardTitle>
              <CardDescription>
                Accepts `.sqlite` and `.db` files up to 25MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-5">
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-5 transition-colors hover:border-primary/50 hover:bg-primary/5",
                  uploading && "pointer-events-none opacity-60"
                )}
              >
                <span className="text-sm font-medium">Choose a SQLite file</span>
                <span className="text-sm text-muted-foreground">
                  Database files are written to a temp directory and removed after
                  inactivity.
                </span>
                <input
                  type="file"
                  accept=".sqlite,.db"
                  className="sr-only"
                  onChange={onFileChange}
                />
                <Button variant="outline" className="w-fit">
                  {uploading ? "Uploading..." : "Select file"}
                </Button>
              </label>
              {session ? (
                <div className="rounded-2xl border border-border bg-background/[0.8] p-4">
                  <p className="text-sm font-medium">{session.fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Session {session.sessionId.slice(0, 8)}... •{" "}
                    {(session.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No database loaded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit border border-foreground/10 bg-background/[0.88] py-0">
            <CardHeader className="gap-2 border-b border-border/70 py-5">
              <CardTitle>Tables</CardTitle>
              <CardDescription>
                Click a table to inspect its columns.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                <div className="p-3">
                  {loadingTables ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-11 rounded-xl" />
                      ))}
                    </div>
                  ) : tables.length > 0 ? (
                    <div className="space-y-2">
                      {tables.map((table) => (
                        <button
                          key={table.name}
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                            selectedTable === table.name
                              ? "border-primary/40 bg-primary/[0.08] text-foreground"
                              : "border-transparent bg-muted/40 hover:border-border hover:bg-muted/70"
                          )}
                          onClick={() => setSelectedTable(table.name)}
                        >
                          <span className="truncate font-medium">
                            {table.name}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            table
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Upload a database to list tables.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Tabs defaultValue="schema" className="gap-4">
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
              <Card className="border border-foreground/10 bg-background/[0.88] py-0">
                <CardHeader className="gap-2 border-b border-border/70 py-5">
                  <CardTitle>
                    {selectedTable ? `${selectedTable} schema` : "Schema viewer"}
                  </CardTitle>
                  <CardDescription>
                    Column metadata from `PRAGMA table_info`.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[420px]">
                    {loadingSchema ? (
                      <div className="space-y-3 p-4">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Skeleton key={index} className="h-12 rounded-xl" />
                        ))}
                      </div>
                    ) : schema.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Null</TableHead>
                            <TableHead>Default</TableHead>
                            <TableHead>PK</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schema.map((column) => (
                            <TableRow key={column.name}>
                              <TableCell className="font-medium">
                                {column.name}
                              </TableCell>
                              <TableCell>{column.type || "TEXT"}</TableCell>
                              <TableCell>{column.notnull ? "NO" : "YES"}</TableCell>
                              <TableCell>
                                {String(column.dflt_value ?? "NULL")}
                              </TableCell>
                              <TableCell>{column.pk ? "YES" : "NO"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">
                        Select a table to inspect its schema.
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="query">
              <Card className="border border-foreground/10 bg-background/[0.88] py-0">
                <CardHeader className="gap-2 border-b border-border/70 py-5">
                  <CardTitle>Read-only SQL</CardTitle>
                  <CardDescription>
                    Allowed: `SELECT`, `WITH`, and read-only `EXPLAIN` queries.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 py-5">
                  <Textarea
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="min-h-[220px] resize-y rounded-2xl bg-muted/25 p-4 font-mono text-[13px] leading-6"
                    spellCheck={false}
                  />
                  <Separator />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Write operations, PRAGMA changes, and multi-statement input
                      are blocked.
                    </p>
                    <Button onClick={runQuery} disabled={runningQuery || !session}>
                      {runningQuery ? "Running..." : "Run query"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results">
              <Card className="border border-foreground/10 bg-background/[0.88] py-0">
                <CardHeader className="gap-2 border-b border-border/70 py-5">
                  <CardTitle>Query results</CardTitle>
                  <CardDescription>
                    Up to 200 rows are returned per query.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[420px]">
                    {results ? (
                      <>
                        <div className="flex items-center justify-between gap-3 px-4 py-4 text-sm text-muted-foreground">
                          <span>{results.rowCount} rows returned</span>
                          {results.truncated ? (
                            <Badge variant="outline">
                              Truncated to {results.limit}
                            </Badge>
                          ) : null}
                        </div>
                        {results.rows.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {results.columns.map((column) => (
                                  <TableHead key={column}>{column}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {results.rows.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                  {results.columns.map((column) => (
                                    <TableCell key={`${rowIndex}-${column}`}>
                                      {String(row[column] ?? "NULL")}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="px-4 pb-4 text-sm text-muted-foreground">
                            Query succeeded but returned no rows.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">
                        Run a query to inspect the result set here.
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  )
}
