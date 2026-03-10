import type { ArchivistMessage } from "./types"
import { exportToHtml, exportToMarkdown, exportToJson } from "./exporters"
import { SiteAdapter } from "~adapters/base"
import { showToast } from "~utils/toast"

export interface ExportSinkOptions {
  filename?: string
  format: "markdown" | "json" | "html"
  timestamp?: boolean
}

export class ExportSink {
  async saveToFile(messages: ArchivistMessage[], options: ExportSinkOptions) {
    let content = ""
    let mimeType = ""
    let extension = ""

    switch (options.format) {
      case "json":
        content = exportToJson(messages)
        mimeType = "application/json"
        extension = "json"
        break
      case "markdown":
        content = exportToMarkdown(messages)
        mimeType = "text/markdown"
        extension = "md"
        break
      case "html":
        content = exportToHtml(messages)
        mimeType = "text/html"
        extension = "html"
        break
    }

    const { downloadFile } = await import("~utils/exporter")
    let filename = options.filename || "skein-export"
    if (options.timestamp) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-")
      filename = `${filename}_${ts}`
    }
    filename = `${filename}.${extension}`

    await downloadFile(content, filename, mimeType)
    showToast(`Archivist Export: ${filename} saved`)
  }

  async copyToClipboard(messages: ArchivistMessage[], format: "markdown" | "json" | "text") {
    let content = ""
    if (format === "markdown") {
      content = exportToMarkdown(messages)
    } else if (format === "json") {
      content = exportToJson(messages)
    } else {
      content = messages.map((m) => `[${m.role}]\n${m.text}`).join("\n\n")
    }

    await navigator.clipboard.writeText(content)
    showToast(`Copied ${messages.length} messages to clipboard`)
  }
}

export const archivistSink = new ExportSink()
