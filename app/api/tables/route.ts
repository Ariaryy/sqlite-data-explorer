import { handleTablesRequest } from "@/lib/api-handlers"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return handleTablesRequest(request)
}
