import type { ArchivistMessage } from "../types"

export interface ArchivistTemplate {
  name: string
  description: string
  format: string
  variables: string[]
}

export const ARCHIVIST_TEMPLATES: ArchivistTemplate[] = [
  {
    name: "Standard Markdown",
    description: "Export as clear markdown with role icons",
    format: "markdown",
    variables: ["title", "date", "branding"],
  },
  {
    name: "Summary / Digest",
    description: "Summarize conversation flow (placeholder)",
    format: "summary",
    variables: ["length", "topics"],
  },
  {
    name: "Developer JSON",
    description: "Clean JSON for API ingestion",
    format: "json",
    variables: ["meta", "messages"],
  },
]

export function applyTemplate(
  template: ArchivistTemplate,
  messages: ArchivistMessage[],
  vars: Record<string, string>,
): ArchivistMessage[] {
  // Logic to process or wrap messages based on template settings
  // For now, this is a conceptual placeholder for the "Templates Toolbox"
  return messages.map((msg) => ({
    ...msg,
    text: msg.text.trim(),
    meta: { ...msg.meta, template: template.name, ...vars },
  }))
}
