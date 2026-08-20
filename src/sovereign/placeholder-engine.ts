export interface ParsedPlaceholder {
  type: "input" | "select" | "file" | "ignore" | "quote" | "variable"
  raw: string; label: string; options?: string[]
}

export interface PlaceholderMap {
  input: Map<string, string>; select: Map<string, string>
  file: Map<string, File | null>; ignore: Map<string, string>
  quote: Map<string, string>; variable: Map<string, string>
}

export class PlaceholderEngine {
  parse(content: string): ParsedPlaceholder[] {
    const results: ParsedPlaceholder[] = []
    const seen = new Set<string>()
    const add = (p: ParsedPlaceholder) => { const k = `${p.type}:${p.label}`; if (!seen.has(k)) { seen.add(k); results.push(p) } }
    let m: RegExpExecArray | null
    const re = {
      input: /\{\{input:([^}]+)\}\}/g, select: /\{\{select:([^|]+)\|([^}]+)\}\}/g,
      file: /\{\{file(?::([^}]+))?\}\}/g, ignore: /\{\{ignore:([^}]+)\}\}/g,
      quote: /\{\{quote:([^}]+)\}\}/g, variable: /\{\{([^{}:|]+)\}\}/g,
    }
    re.input.lastIndex = 0; while ((m = re.input.exec(content)) !== null) add({ type: "input", raw: m[0], label: m[1].trim() })
    re.select.lastIndex = 0; while ((m = re.select.exec(content)) !== null) add({ type: "select", raw: m[0], label: m[1].trim(), options: m[2].split("|").map(s => s.trim()) })
    re.file.lastIndex = 0; while ((m = re.file.exec(content)) !== null) add({ type: "file", raw: m[0], label: m[1]?.trim() || "file" })
    re.ignore.lastIndex = 0; while ((m = re.ignore.exec(content)) !== null) add({ type: "ignore", raw: m[0], label: m[1].trim() })
    re.quote.lastIndex = 0; while ((m = re.quote.exec(content)) !== null) add({ type: "quote", raw: m[0], label: m[1].trim() })
    re.variable.lastIndex = 0; while ((m = re.variable.exec(content)) !== null) { const label = m[1].trim(); if (!seen.has(`input:${label}`) && !seen.has(`select:${label}`)) add({ type: "variable", raw: m[0], label }) }
    return results
  }

  apply(content: string, map: PlaceholderMap): string {
    let r = content
    map.select.forEach((v, k) => { r = r.replace(new RegExp(`\\{\\{select:${this.esc(k)}\\|[^}]+\\}\\}`, "g"), v) })
    map.input.forEach((v, k) => { r = r.replace(new RegExp(`\\{\\{input:${this.esc(k)}\\}\\}`, "g"), v) })
    map.variable.forEach((v, k) => { r = r.replace(new RegExp(`\\{\\{${this.esc(k)}\\}\\}`, "g"), v) })
    map.quote.forEach((v, k) => { r = r.replace(new RegExp(`\\{\\{quote:${this.esc(k)}\\}\\}`, "g"), `> ${v.split("\n").join("\n> ")}\n`) })
    return r.trim()
  }

  createEmptyMap(): PlaceholderMap {
    return { input: new Map(), select: new Map(), file: new Map(), ignore: new Map(), quote: new Map(), variable: new Map() }
  }

  private esc(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }
}
