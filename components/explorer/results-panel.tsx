"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { QueryResult } from "@/lib/types"

type ResultsPanelProps = {
  results: QueryResult | null
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
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
                  <Badge variant="outline">Truncated to {results.limit}</Badge>
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
  )
}
