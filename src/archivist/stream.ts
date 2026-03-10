import type { ArchivistMessage } from "../types"

export interface MessageProvider {
  name: string
  canFetch: (sessionId: string) => boolean
  fetch: (sessionId: string) => Promise<ArchivistMessage[]>
}

export function normalizeMessages(messages: any[], provider: string): ArchivistMessage[] {
  return messages.map((m) => {
    const role = m.role || (m.role_type === "human" ? "user" : "assistant")
    const text = m.text || m.content || m.message || ""
    const createdAt = m.createdAt || m.created_at || m.timestamp || new Date().toISOString()
    const id =
      m.id || m.message_id || `norm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    return { id, provider, role, text, createdAt, meta: m }
  })
}

export class NormalizedMessageStream {
  private messages: ArchivistMessage[] = []

  push(msgs: ArchivistMessage[]) {
    this.messages.push(...msgs)
  }

  getMessages() {
    return this.messages
  }

  clear() {
    this.messages = []
  }
}

export const archivistStream = new NormalizedMessageStream()
