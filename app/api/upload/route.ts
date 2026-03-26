import { handleUploadRequest } from "@/lib/api-handlers"

export const runtime = "nodejs"

export async function POST(request: Request) {
  return handleUploadRequest(request)
}
