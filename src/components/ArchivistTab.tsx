import React, { useState } from "react"
import { captureNormalized } from "~archivist/providers"
import { exportMD, exportJSON, exportTXT } from "~archivist/exporters"
import { sendToNative } from "~archivist/native-bridge"

export const ArchivistTab: React.FC = () => {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Ready")
  const [data, setData] = useState<{ title: string; provider: string; messages: any[] } | null>(
    null,
  )

  const capture = async () => {
    setBusy(true)
    setStatus("Capturing…")
    try {
      const r = await captureNormalized({ chatgptApiFirst: true })
      setData({ title: r.title, provider: r.provider, messages: r.messages })
      setStatus("Captured: " + r.messages.length + " msgs")
    } catch (e: any) {
      setStatus("Capture failed: " + String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  const sendVault = async () => {
    if (!data) return
    setBusy(true)
    setStatus("Sending to Vault…")
    try {
      const res = await sendToNative({
        op: "upsert",
        title: data.title,
        provider: data.provider,
        url: location.href,
        messages: data.messages,
      })
      setStatus(res.ok ? "Vault OK" : "Vault FAIL: " + (res.error || "unknown"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>Archivist</div>
      <div style={{ opacity: 0.8, fontSize: 12 }}>
        ChatGPT: API-first. Others: DOM capture. Exports reuse Ophel formatter.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={busy} onClick={capture}>
          Capture
        </button>
        <button
          disabled={busy || !data}
          onClick={() => data && exportMD(data.title, data.provider, data.messages as any)}>
          Export MD
        </button>
        <button
          disabled={busy || !data}
          onClick={() => data && exportJSON(data.title, data.provider, data.messages as any)}>
          Export JSON
        </button>
        <button
          disabled={busy || !data}
          onClick={() => data && exportTXT(data.title, data.provider, data.messages as any)}>
          Export TXT
        </button>
        <button disabled={busy || !data} onClick={sendVault}>
          Send to Vault
        </button>
      </div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{status}</div>
    </div>
  )
}
