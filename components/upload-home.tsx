"use client"

import type { ChangeEvent } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { readJson } from "@/lib/api-client"
import type { UploadSession } from "@/lib/types"
import { cn } from "@/lib/utils"

function createExplorerHref(session: UploadSession) {
  const params = new URLSearchParams({
    sessionId: session.sessionId,
    fileName: session.fileName,
    size: String(session.size),
  })

  return `/explorer?${params.toString()}`
}

export function UploadHome() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    setError(null)

    try {
      const session = await readJson<UploadSession>(
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
      )

      router.push(createExplorerHref(session))
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed."
      )
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.16),transparent_24%),linear-gradient(180deg,rgba(245,248,242,0.98),rgba(240,246,239,1))] px-4 py-8 text-foreground sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(115,201,122,0.2),transparent_26%),linear-gradient(180deg,rgba(18,22,18,1),rgba(11,15,12,1))]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="grid gap-5 rounded-[28px] border border-foreground/10 bg-background/[0.9] p-6 shadow-[0_24px_120px_-48px_rgba(27,35,27,0.6)] backdrop-blur sm:p-8 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-5">
            <Badge className="rounded-full bg-primary/[0.12] px-3 py-1 text-[11px] tracking-[0.28em] text-primary uppercase hover:bg-primary/[0.12]">
              SQLite field station
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Upload a SQLite file and open the explorer workspace.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                The home page now just handles ingestion. Once the upload
                finishes, the app moves straight into the schema and query
                workspace for that session.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
              <span>Temporary storage only</span>
              <span>Read-only queries</span>
              <span>25MB upload cap</span>
            </div>
          </div>

          <Card className="border border-foreground/10 bg-card/[0.8] py-0">
            <CardHeader className="gap-2 border-b border-border/70 py-5">
              <CardTitle>Upload database</CardTitle>
              <CardDescription>
                Accepts `.sqlite` and `.db` files up to 25MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-5">
              <label
                className={cn(
                  "flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-5 transition-colors hover:border-primary/50 hover:bg-primary/5",
                  uploading && "pointer-events-none opacity-60"
                )}
              >
                <span className="text-sm font-medium">
                  Choose a SQLite file
                </span>
                <span className="text-sm text-muted-foreground">
                  Database files are written to a temp directory and removed
                  after inactivity.
                </span>
                <input
                  type="file"
                  accept=".sqlite,.db"
                  className="sr-only"
                  onChange={onFileChange}
                />
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-fit"
                  )}
                >
                  {uploading ? "Uploading..." : "Select file"}
                </span>
              </label>
            </CardContent>
          </Card>
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </main>
  )
}
