export type ProviderId = "chatgpt" | "gemini" | "claude" | "grok" | "copilot" | "unknown"
export type Role = "user" | "assistant" | "system" | "tool"
export type NormalizedMessage = {
  id: string
  provider: ProviderId
  role: Role
  createdAt?: string
  markdown: string
  meta?: Record<string, unknown>
}
