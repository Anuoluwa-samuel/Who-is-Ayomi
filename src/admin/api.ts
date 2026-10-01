export type Content = Record<string, Record<string, unknown>>

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init })
  const type = res.headers.get("content-type") ?? ""
  if (!type.includes("json")) throw new ApiError("The admin server isn't running (start it with npm run dev).", res.status || 0)
  const data = await res.json()
  if (!res.ok) throw new ApiError(data.error || "Something went wrong", res.status)
  return data as T
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const api = {
  me: () => request<{ authed: boolean; passwordSet: boolean; canSetup: boolean }>("/api/admin/me"),
  login: (password: string) => request<{ ok: true }>("/api/admin/login", json("POST", { password })),
  setup: (password: string) => request<{ ok: true }>("/api/admin/setup", json("POST", { password })),
  logout: () => request<{ ok: true }>("/api/admin/logout", json("POST")),
  content: () => request<Content>("/api/content?fresh=1"),
  save: (section: string, data: unknown) => request<{ ok: true; rebuilding?: boolean }>(`/api/admin/content/${section}`, json("PUT", data)),
  history: (section: string) => request<{ versions: number[] }>(`/api/admin/history/${section}`),
  restore: (section: string, version: number) =>
    request<{ ok: true; data: Record<string, unknown> }>(`/api/admin/restore/${section}`, json("POST", { version })),
  upload: async (file: File) => {
    const body = new FormData()
    body.append("file", file)
    return request<{ url: string }>("/api/admin/upload", { method: "POST", body })
  },
}
