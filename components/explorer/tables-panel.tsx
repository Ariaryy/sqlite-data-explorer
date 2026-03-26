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
import type { TableInfo } from "@/lib/types"
import { cn } from "@/lib/utils"

type TablesPanelProps = {
  loadingTables: boolean
  selectedTable: string
  tables: TableInfo[]
  onSelectTable: (tableName: string) => void
}

export function TablesPanel({
  loadingTables,
  selectedTable,
  tables,
  onSelectTable,
}: TablesPanelProps) {
  return (
    <Card className="h-fit border border-foreground/10 bg-background/[0.88] py-0">
      <CardHeader className="gap-2 border-b border-border/70 py-5">
        <CardTitle>Tables</CardTitle>
        <CardDescription>Click a table to inspect its columns.</CardDescription>
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
                    onClick={() => onSelectTable(table.name)}
                  >
                    <span className="truncate font-medium">{table.name}</span>
                    <span className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                      table
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                No tables were found in this database.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
