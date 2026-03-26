import type { ApiResponse } from "@/lib/types"

export async function readJson<T>(response: Response) {
  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Request failed." : payload.error.message)
  }

  return payload.data
}
