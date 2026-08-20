/**
 * Meta AI Adapter — Sovereign Edition
 *
 * Hardened from Ghost GENERIC_HOSTS + My Prompt platform detection.
 * Layers: ProseMirror → contenteditable → textarea → aria-label fallbacks.
 */

import { SITE_IDS } from "~constants/defaults"
import { SiteAdapter } from "./base"

export class MetaAdapter extends SiteAdapter {
  match(): boolean {
    const h = window.location.hostname
    return h === "meta.ai" || h.endsWith(".meta.ai") || h.includes("meta.ai")
  }

  getSiteId(): string {
    return SITE_IDS.META_AI
  }

  getSiteName(): string {
    return "Meta AI"
  }

  getTextareaSelectors(): string[] {
    return [
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div.ProseMirror[contenteditable="true"]',
      'form textarea',
      'div[role="combobox"] div[contenteditable="true"]',
      'textarea[placeholder*="Ask" i]',
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Say something" i]',
    ]
  }

  getSendButtonSelectors(): string[] {
    return [
      'button[aria-label*="Send" i]',
      'button[type="submit"]',
      'button[data-testid*="send" i]',
      'div[role="button"][aria-label*="Send" i]',
      'button svg[aria-label*="send" i]',
      'button:has(svg[data-icon="paper-plane"])',
    ]
  }

  getAssistantMessageSelectors(): string[] {
    return [
      '[data-message-author-role="assistant"]',
      'div[role="article"][data-testid*="assistant" i]',
      'div[class*="response" i][class*="ai" i]',
      'div[data-testid*="assistant-response"]',
      'div[data-testid*="bot-message"]',
      '[data-testid="ai-message"]',
    ]
  }

  insertPrompt(content: string): boolean {
    const editor = this.findTextarea()
    if (!editor) return false

    if (editor instanceof HTMLTextAreaElement) {
      editor.value = content
      editor.dispatchEvent(new Event("input", { bubbles: true }))
      editor.dispatchEvent(new Event("change", { bubbles: true }))
    } else if (editor.isContentEditable) {
      editor.innerHTML = ""
      editor.textContent = content
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, data: content, inputType: "insertText" }))
    }

    editor.dispatchEvent(new Event("input", { bubbles: true }))
    editor.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }))
    editor.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }))

    return true
  }

  getOutline(): import("./base").OutlineItem[] {
    const items: import("./base").OutlineItem[] = []
    const turnSelector = '[data-testid="conversation-turn"], [class*="message-pair"], div[role="article"], [data-message-author-role], [data-testid="message-turn"]'
    const turns = document.querySelectorAll(turnSelector)

    turns.forEach((turn, idx) => {
      const isUser =
        turn.querySelector('[data-message-author-role="user"], div[role="textbox"], [class*="user-message"], [data-testid="user-message"]') !== null ||
        turn.getAttribute("data-message-author-role") === "user"

      const textEl = turn.querySelector('p, div[class*="text"], [data-testid="message-content"], .prose, [class*="markdown"]')
      const text = textEl?.textContent?.trim() || ""

      if (text) {
        items.push({
          level: 1,
          text: text.slice(0, 120),
          element: turn,
          isUserQuery: isUser,
          id: `meta-turn-${idx}`,
          navigationId: `meta-nav-${idx}`,
          wordCount: text.split(/\s+/).length,
        })
      }
    })

    return items
  }

  getConversationObserverConfig(): import("./base").ConversationObserverConfig {
    return {
      selector: '[data-testid="conversation-turn"], div[role="article"], [class*="message-pair"], [data-message-author-role], [data-testid="message-turn"]',
      shadow: false,
      extractInfo: (el) => {
        const textEl = el.querySelector('p, div[class*="text"], [data-testid="message-content"], .prose, [class*="markdown"]')
        const text = textEl?.textContent?.trim() || ""
        return {
          id: `meta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: text.slice(0, 60) || "Meta AI Conversation",
          url: window.location.href,
        }
      },
      getTitleElement: (el) => el.querySelector('h1, h2, [class*="title"]') || el,
    }
  }

  getExportConfig(): import("./base").ExportConfig {
    return {
      userQuerySelector: '[data-message-author-role="user"], div[class*="user-message"], div[role="textbox"], [data-testid="user-message"]',
      assistantResponseSelector: '[data-message-author-role="assistant"], div[class*="assistant-message"], div[role="article"], [data-testid="assistant-message"]',
      turnSelector: '[data-testid="conversation-turn"], [class*="message-pair"], [data-testid="message-turn"]',
      useShadowDOM: false,
    }
  }

  isGenerating(): boolean {
    return (
      document.querySelector('[class*="loading"], [class*="generating"], [data-testid="loading"], [class*="spinner"], [class*="animate-spin"]') !== null ||
      document.querySelector('[aria-busy="true"]') !== null ||
      document.querySelector('svg[class*="animate"], [class*="skeleton"]') !== null
    )
  }

  getNetworkMonitorConfig(): import("./base").NetworkMonitorConfig {
    return {
      urlPatterns: ["meta.ai/api/*", "graph.meta.ai/*", "*.meta.ai/api/*", "meta.ai/graphql", "meta.ai/api/graphql"],
      silenceThreshold: 8000,
    }
  }

  getZenModeConfig(): import("./base").ZenModeConfig {
    return {
      hide: ['header', 'nav', '[class*="sidebar"]', '[class*="footer"]', '[data-testid="side-nav"]', '[class*="navigation"]'],
      rootClass: { selector: "body", className: "ophel-zen-meta" },
    }
  }

  supportsNetworkInterception(): boolean {
    return true
  }

  supportsAutopilot(): boolean {
    return true
  }
}
