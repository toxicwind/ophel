import { getAdapter } from "~adapters"
import { SITE_IDS } from "~constants/site"
import type { ProviderId, NormalizedMessage } from "../types"
import { captureChatGPTApi } from "./chatgpt_api"
import { captureDOM } from "./dom_capture"

const providerFromSite = (id: string): ProviderId => {
  switch (id) {
    case SITE_IDS.CHATGPT:
      return "chatgpt"
    case SITE_IDS.GEMINI:
      return "gemini"
    case SITE_IDS.CLAUDE:
      return "claude"
    case SITE_IDS.GROK:
      return "grok"
    case SITE_IDS.COPILOT:
      return "copilot"
    default:
      return "unknown"
  }
}

export async function captureNormalized(opts?: {
  chatgptApiFirst?: boolean
}): Promise<{ title: string; provider: ProviderId; messages: NormalizedMessage[] }> {
  const adapter = getAdapter()
  if (!adapter) throw new Error("no site adapter")
  const provider = providerFromSite(adapter.getSiteId())

  if (provider === "chatgpt" && opts?.chatgptApiFirst) {
    try {
      const api = await captureChatGPTApi()
      return { title: api.title, provider, messages: api.messages }
    } catch {}
  }

  const dom = captureDOM(adapter, provider)
  return { title: dom.title, provider, messages: dom.messages }
}
