export const SIGIL_PROCEED = "[[OPHEL::PROCEED]]"
export const SIGIL_HALT = "[[OPHEL::HALT]]"
export const SIGIL_ROADMAP = "[[OPHEL::ROADMAP]]"
export const SIGIL_SHORT = "[[OPHEL::SHORT]]"

export type SigilDecision = "proceed" | "halt" | "roadmap" | "short" | null

export class SigilEngine {
  detect(text: string): SigilDecision {
    if (text.includes(SIGIL_PROCEED)) return "proceed"
    if (text.includes(SIGIL_HALT)) return "halt"
    if (text.includes(SIGIL_ROADMAP)) return "roadmap"
    if (text.includes(SIGIL_SHORT)) return "short"
    if (/\[\s*OPHEL\s*::\s*PROCEED\s*\]/i.test(text)) return "proceed"
    if (/\[\s*OPHEL\s*::\s*HALT\s*\]/i.test(text)) return "halt"
    if (/\[\s*OPHEL\s*::\s*ROADMAP\s*\]/i.test(text)) return "roadmap"
    return null
  }

  strip(text: string): string {
    return text.replace(new RegExp(SIGIL_PROCEED.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
      .replace(new RegExp(SIGIL_HALT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
      .replace(/\[\s*OPHEL\s*::\s*(PROCEED|HALT|ROADMAP|SHORT)\s*\]/gi, "").trim()
  }
}
