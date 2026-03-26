import { SQLiteWorkspace } from "@/components/explorer/workspace"

type ExplorerPageProps = {
  searchParams: Promise<{
    sessionId?: string | string[]
    fileName?: string | string[]
    size?: string | string[]
  }>
}

function getSingleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ExplorerPage({
  searchParams,
}: ExplorerPageProps) {
  const params = await searchParams

  return (
    <SQLiteWorkspace
      sessionId={getSingleValue(params.sessionId)}
      fileName={getSingleValue(params.fileName)}
      size={getSingleValue(params.size)}
    />
  )
}
