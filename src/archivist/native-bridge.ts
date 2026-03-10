import { NATIVE_HOST_NAME } from "~brand/brand"

type NMReq = { type: string; payload?: any }
type NMRes = { ok: boolean; data?: any; error?: string }

const HOST = NATIVE_HOST_NAME

export function registerArchivistBridgeHandler() {
  if (!chrome?.runtime?.onMessage) return
  chrome.runtime.onMessage.addListener((msg: NMReq, _sender, sendResponse) => {
    if (!msg || msg.type !== "archivist:native") return
    let port: chrome.runtime.Port | null = null
    try {
      port = chrome.runtime.connectNative(HOST)
      port.onMessage.addListener((res: NMRes) => {
        sendResponse(res)
        try {
          port?.disconnect()
        } catch {}
      })
      port.onDisconnect.addListener(() => {
        const e = chrome.runtime.lastError?.message
        if (e) sendResponse({ ok: false, error: e })
      })
      port.postMessage(msg.payload || {})
      return true
    } catch (e: any) {
      sendResponse({ ok: false, error: String(e?.message || e) })
      try {
        port?.disconnect()
      } catch {}
      return false
    }
  })
}

export async function sendToNative(payload: any): Promise<NMRes> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "archivist:native", payload }, (res) => {
        if (!res)
          return resolve({ ok: false, error: chrome.runtime.lastError?.message || "no response" })
        resolve(res as NMRes)
      })
    } catch (e: any) {
      resolve({ ok: false, error: String(e?.message || e) })
    }
  })
}
