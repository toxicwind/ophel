import { ArchivistMessage } from "./types"
import { archivistStream } from "./stream"
import { ProviderAdapter } from "./providers/adapter"
import { SiteAdapter } from "~adapters/base"
import { filterMessages, SelectorFilterOptions } from "./selector"
import { archivistSink, ExportSinkOptions } from "./sinks"
import { showToast } from "~utils/toast"

export class ArchivistPipeline {
  private adapter: ProviderAdapter | null = null

  constructor(siteAdapter?: SiteAdapter) {
    if (siteAdapter) {
      this.adapter = new ProviderAdapter(siteAdapter)
    }
  }

  async runCapture() {
    if (!this.adapter) {
      showToast("Archivist: No active site adapter")
      return []
    }

    showToast("Archivist: Capturing session...")
    const messages = await this.adapter.captureCurrentSession()
    archivistStream.clear()
    archivistStream.push(messages)
    showToast(`Archivist: Captured ${messages.length} messages`)
    return messages
  }

  getStream() {
    return archivistStream
  }

  async export(options: ExportSinkOptions, filterOptions?: SelectorFilterOptions) {
    let messages = archivistStream.getMessages()
    if (filterOptions) {
      messages = filterMessages(messages, filterOptions)
    }

    if (messages.length === 0) {
      showToast("Archivist: No messages to export")
      return
    }

    await archivistSink.saveToFile(messages, options)
  }
}

export const archivistPipeline = new ArchivistPipeline()
