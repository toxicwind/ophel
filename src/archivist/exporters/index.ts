import type { NormalizedMessage } from "../types"
import {
  createExportMetadata,
  formatToMarkdown,
  formatToJSON,
  formatToTXT,
  downloadFile,
} from "~utils/exporter"

const toExportMessages = (msgs: NormalizedMessage[]) =>
  msgs.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.markdown }))

export const exportMD = async (title: string, provider: string, msgs: NormalizedMessage[]) => {
  const meta = createExportMetadata({ title, author: provider, url: location.href })
  const out = formatToMarkdown(meta, toExportMessages(msgs))
  await downloadFile(out, title + ".md", "text/markdown;charset=utf-8")
}
export const exportJSON = async (title: string, provider: string, msgs: NormalizedMessage[]) => {
  const meta = createExportMetadata({ title, author: provider, url: location.href })
  const out = formatToJSON(meta, toExportMessages(msgs))
  await downloadFile(out, title + ".json", "application/json;charset=utf-8")
}
export const exportTXT = async (title: string, provider: string, msgs: NormalizedMessage[]) => {
  const meta = createExportMetadata({ title, author: provider, url: location.href })
  const out = formatToTXT(meta, toExportMessages(msgs))
  await downloadFile(out, title + ".txt", "text/plain;charset=utf-8")
}
