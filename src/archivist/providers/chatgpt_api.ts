import type { NormalizedMessage } from "../types"

type ChatGPTSession = { accessToken?: string } | null
type ChatGPTConversation = {
  title?: string
  current_node?: string
  mapping?: Record<
    string,
    {
      id: string
      parent?: string | null
      message?: {
        id?: string
        create_time?: number
        author?: { role?: string }
        content?: { content_type?: string; parts?: any[] }
        metadata?: any
      } | null
    }
  >
}

const cidFromUrl = (): string => {
  const p = location.pathname || ""
  const m = p.match(/\/c\/([0-9a-f-]{20,})/i)
  if (!m) throw new Error("missing /c/<id> in URL")
  return m[1]
}

const mdFromParts = (parts: any[]) =>
  Array.isArray(parts)
    ? parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join("\n")
    : ""

export async function captureChatGPTApi(): Promise<{
  title: string
  messages: NormalizedMessage[]
}> {
  const cid = cidFromUrl()
  const s = (await (await fetch("/api/auth/session")).json()) as ChatGPTSession
  const token = s?.accessToken
  if (!token) throw new Error("missing accessToken from /api/auth/session")

  const r = await fetch("/backend-api/conversation/" + cid, {
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
  })
  if (!r.ok) throw new Error("backend-api failed: " + r.status)
  const c = (await r.json()) as ChatGPTConversation
  const mapping = c.mapping || {}
  const cur = c.current_node
  if (!cur || !mapping[cur]) throw new Error("missing current_node")

  const chain: string[] = []
  let n: string | undefined = cur
  const seen = new Set<string>()
  while (n && mapping[n] && !seen.has(n)) {
    seen.add(n)
    chain.push(n)
    n = mapping[n].parent || undefined
  }
  chain.reverse()

  const out: NormalizedMessage[] = []
  for (const id of chain) {
    const m = mapping[id]?.message
    if (!m?.content) continue
    const role = (m.author?.role || "unknown").toLowerCase()
    if (role === "system") continue
    const md = mdFromParts(m.content.parts || [])
    if (!md.trim()) continue
    out.push({
      id: m.id || id,
      provider: "chatgpt",
      role: role === "assistant" ? "assistant" : role === "user" ? "user" : "tool",
      createdAt:
        typeof m.create_time === "number"
          ? new Date(m.create_time * 1000).toISOString()
          : undefined,
      markdown: md,
      meta: m.metadata || undefined,
    })
  }
  return { title: c.title || "ChatGPT Conversation", messages: out }
}
