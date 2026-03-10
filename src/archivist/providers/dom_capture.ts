import type { NormalizedMessage, ProviderId } from "../types"
import { htmlToMarkdown } from "~utils/exporter"
import type { BaseAdapter, ExportConfig } from "~adapters/base"

export function captureDOM(
  adapter: BaseAdapter,
  provider: ProviderId,
): { title: string; messages: NormalizedMessage[] } {
  const cfg: ExportConfig = adapter.getExportConfig()
  const title = adapter.getConversationTitle() || cfg.title() || "Conversation"
  const turns = Array.from(document.querySelectorAll(cfg.turnSelector))
  const out: NormalizedMessage[] = []
  let i = 0
  for (const t of turns) {
    const turn = t as Element
    const uq = turn.querySelector(cfg.userQuerySelector)
    const ar = turn.querySelector(cfg.assistantResponseSelector)
    if (uq) {
      const md = adapter.extractUserQueryText(uq as HTMLElement).trim()
      if (md) out.push({ id: provider + ":u:" + i++, provider, role: "user", markdown: md })
    }
    if (ar) {
      const md = htmlToMarkdown(ar as HTMLElement).trim()
      if (md) out.push({ id: provider + ":a:" + i++, provider, role: "assistant", markdown: md })
    }
  }
  return { title, messages: out }
}
