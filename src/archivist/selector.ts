import type { ArchivistMessage } from "../types"

export interface SelectorFilterOptions {
  includeRoles?: string[]
  excludeRoles?: string[]
  startTime?: number
  endTime?: number
  keywords?: string[]
  regex?: string
}

export function filterMessages(
  messages: ArchivistMessage[],
  options: SelectorFilterOptions,
): ArchivistMessage[] {
  let filtered = [...messages]

  if (options.includeRoles && options.includeRoles.length > 0) {
    filtered = filtered.filter((m) => options.includeRoles!.includes(m.role))
  }

  if (options.excludeRoles && options.excludeRoles.length > 0) {
    filtered = filtered.filter((m) => !options.excludeRoles!.includes(m.role))
  }

  if (options.startTime) {
    filtered = filtered.filter((m) => {
      const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0
      return ts >= options.startTime!
    })
  }

  if (options.endTime) {
    filtered = filtered.filter((m) => {
      const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0
      return ts <= options.endTime!
    })
  }

  if (options.keywords && options.keywords.length > 0) {
    filtered = filtered.filter((m) => {
      const text = m.text.toLowerCase()
      return options.keywords!.some((k) => text.includes(k.toLowerCase()))
    })
  }

  if (options.regex) {
    try {
      const re = new RegExp(options.regex, "i")
      filtered = filtered.filter((m) => re.test(m.text))
    } catch (e) {
      console.error("Invalid regex in SelectorFilter:", e)
    }
  }

  return filtered
}
