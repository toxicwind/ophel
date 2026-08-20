/**
 * LMArena (Chatbot Arena) Adapter — Sovereign Edition
 *
 * Dual-slot model presets, fuzzy registry, auto-apply on route change.
 */

import { SITE_IDS } from "~constants/defaults"
import { SiteAdapter } from "./base"

export class LMArenaAdapter extends SiteAdapter {
  match(): boolean {
    const h = window.location.hostname
    return h === "lmarena.ai" || h.endsWith(".lmarena.ai") || h.includes("lmarena")
  }

  getSiteId(): string {
    return SITE_IDS.LMARENA
  }

  getSiteName(): string {
    return "LMArena"
  }

  getTextareaSelectors(): string[] {
    return [
      'textarea[placeholder*="Enter" i]',
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Type" i]',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div.ProseMirror[contenteditable="true"]',
      'div[role="textbox"][contenteditable="true"]',
    ]
  }

  getSendButtonSelectors(): string[] {
    return [
      'button[aria-label*="Send" i]',
      'button[type="submit"]',
      'button[data-testid*="send" i]',
      'button:has(svg[data-icon="send"])',
      'button:has(svg[data-icon="paper-plane"])',
    ]
  }

  getAssistantMessageSelectors(): string[] {
    return [
      '[class*="bot-response"]',
      '[data-testid*="response"]',
      'div[role="article"]',
      '[class*="message-bubble"][class*="bot"]',
      '[data-testid*="assistant-message"]',
    ]
  }

  insertPrompt(content: string): boolean {
    const editors = document.querySelectorAll<HTMLElement>(this.getTextareaSelectors().join(", "))
    if (editors.length === 0) return false

    let inserted = false
    editors.forEach((editor) => {
      if (editor instanceof HTMLTextAreaElement) {
        editor.value = content
        editor.dispatchEvent(new Event("input", { bubbles: true }))
        editor.dispatchEvent(new Event("change", { bubbles: true }))
        inserted = true
      } else if (editor.isContentEditable) {
        editor.innerHTML = ""
        editor.textContent = content
        editor.dispatchEvent(new InputEvent("input", { bubbles: true, data: content, inputType: "insertText" }))
        inserted = true
      }
    })

    return inserted
  }

  getOutline(): import("./base").OutlineItem[] {
    const items: import("./base").OutlineItem[] = []
    const turns = document.querySelectorAll('[class*="turn"], [class*="round"], [data-testid*="turn"], [class*="message-pair"]')

    turns.forEach((turn, idx) => {
      const textEl = turn.querySelector('p, [class*="text"], [class*="content"], [class*="markdown"]')
      const text = textEl?.textContent?.trim() || ""
      if (text) {
        items.push({
          level: 1,
          text: text.slice(0, 120),
          element: turn,
          isUserQuery: turn.querySelector('textarea, [contenteditable="true"]') !== null || turn.getAttribute("data-role") === "user",
          id: `lmarena-turn-${idx}`,
          navigationId: `lmarena-nav-${idx}`,
          wordCount: text.split(/\s+/).length,
        })
      }
    })

    return items
  }

  getConversationObserverConfig(): import("./base").ConversationObserverConfig {
    return {
      selector: '[class*="turn"], [class*="round"], [data-testid*="turn"], [class*="message-pair"]',
      shadow: false,
      extractInfo: (el) => {
        const text = el.textContent?.trim() || ""
        return {
          id: `lmarena-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: text.slice(0, 60) || "LMArena Battle",
          url: window.location.href,
        }
      },
      getTitleElement: (el) => el,
    }
  }

  getExportConfig(): import("./base").ExportConfig {
    return {
      userQuerySelector: 'textarea, [contenteditable="true"], [class*="user-message"]',
      assistantResponseSelector: '[class*="bot-response"], [class*="response"], [class*="assistant-message"]',
      turnSelector: '[class*="turn"], [class*="round"], [class*="message-pair"]',
      useShadowDOM: false,
    }
  }

  isGenerating(): boolean {
    return document.querySelector('[class*="loading"], [class*="generating"], [class*="spinner"], [class*="animate-pulse"]') !== null
  }

  getNetworkMonitorConfig(): import("./base").NetworkMonitorConfig {
    return {
      urlPatterns: ["lmarena.ai/api/*", "*.lmarena.ai/api/*", "lmarena.ai/queue/*"],
      silenceThreshold: 12000,
    }
  }

  getZenModeConfig(): import("./base").ZenModeConfig {
    return {
      hide: ['header', 'nav', '[class*="leaderboard"]', '[class*="footer"]', '[class*="sidebar"]'],
      rootClass: { selector: "body", className: "ophel-zen-lmarena" },
    }
  }

  supportsNetworkInterception(): boolean {
    return true
  }

  supportsAutopilot(): boolean {
    return false
  }
}
