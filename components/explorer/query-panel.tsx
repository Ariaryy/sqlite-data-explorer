"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

type QueryPanelProps = {
  disabled: boolean
  query: string
  runningQuery: boolean
  onQueryChange: (query: string) => void
  onRunQuery: () => void
}

export function QueryPanel({
  disabled,
  query,
  runningQuery,
  onQueryChange,
  onRunQuery,
}: QueryPanelProps) {
  return (
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
          onChange={(event) => onQueryChange(event.target.value)}
          className="min-h-[220px] resize-y rounded-2xl bg-muted/25 p-4 font-mono text-[13px] leading-6"
          spellCheck={false}
        />
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Write operations, PRAGMA changes, and multi-statement input are
            blocked.
          </p>
          <Button onClick={onRunQuery} disabled={runningQuery || disabled}>
            {runningQuery ? "Running..." : "Run query"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
