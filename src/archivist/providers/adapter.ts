import { SiteAdapter } from "~adapters/base"
import type { ArchivistMessage } from "../types"
import { DOMToolkit } from "~utils/dom-toolkit"

export class ProviderAdapter {
  constructor(private siteAdapter: SiteAdapter) {}

  async captureCurrentSession(): Promise<ArchivistMessage[]> {
    const config = this.siteAdapter.getExportConfig()
    if (!config) {
      console.warn(`[Archivist] No export config for ${this.siteAdapter.getName()}`)
      return []
    }

    const { userQuerySelector, assistantResponseSelector, turnSelector, useShadowDOM } = config
    const messages: ArchivistMessage[] = []

    const userNodes =
      (DOMToolkit.query(userQuerySelector, {
        all: true,
        shadow: useShadowDOM,
      }) as Element[]) || []

    const aiNodes =
      (DOMToolkit.query(assistantResponseSelector, {
        all: true,
        shadow: useShadowDOM,
      }) as Element[]) || []

    const maxLen = Math.max(userNodes.length, aiNodes.length)
    const provider = this.siteAdapter.getSiteId()

    for (let i = 0; i < maxLen; i++) {
      if (userNodes[i]) {
        messages.push({
          id: `arch-u-${i}-${Date.now()}`,
          provider,
          role: "user",
          text: this.siteAdapter.extractUserQueryText(userNodes[i]),
        })
      }
      if (aiNodes[i]) {
        messages.push({
          id: `arch-a-${i}-${Date.now()}`,
          provider,
          role: "assistant",
          text: this.siteAdapter.extractAssistantResponseText(aiNodes[i]),
        })
      }
    }

    return messages
  }
}
