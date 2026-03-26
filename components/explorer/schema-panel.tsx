"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SchemaColumn } from "@/lib/types"

type SchemaPanelProps = {
  loadingSchema: boolean
  schema: SchemaColumn[]
  selectedTable: string
}

export function SchemaPanel({
  loadingSchema,
  schema,
  selectedTable,
}: SchemaPanelProps) {
  return (
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
                    <TableCell className="font-medium">{column.name}</TableCell>
                    <TableCell>{column.type || "TEXT"}</TableCell>
                    <TableCell>{column.notnull ? "NO" : "YES"}</TableCell>
                    <TableCell>{String(column.dflt_value ?? "NULL")}</TableCell>
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
  )
}
