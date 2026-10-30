import { isUserscriptPlatform } from "~platform/utils"

type ReqHandler = (url: string, body: unknown) => void
type ResHandler = (url: string, data: unknown) => void

export class NetworkInterceptor {
  private reqHandlers: ReqHandler[] = []
  private resHandlers: ResHandler[] = []
  private injected = false

  onRequest(h: ReqHandler): () => void { this.reqHandlers.push(h); return () => { this.reqHandlers = this.reqHandlers.filter(x => x !== h) } }
  onResponse(h: ResHandler): () => void { this.resHandlers.push(h); return () => { this.resHandlers = this.resHandlers.filter(x => x !== h) } }

  activate(): void {
    if (this.injected) return
    this.injected = true
    isUserscriptPlatform() ? this.activateUserscript() : this.activateExtension()
  }

  private activateUserscript(): void {
    const origFetch = window.fetch
    window.fetch = async (...args) => {
      const [url, init] = args
      const urlStr = typeof url === "string" ? url : url instanceof Request ? url.url : String(url)
      this.reqHandlers.forEach(h => h(urlStr, init?.body))
      const resp = await origFetch.apply(window, args)
      const clone = resp.clone()
      clone.text().then(text => this.resHandlers.forEach(h => h(urlStr, text)))
      return resp
    }
  }

  private activateExtension(): void {
    const code = function () {
      const orig = window.fetch
      window.fetch = async (...args: Parameters<typeof fetch>) => {
        const [url, init] = args
        const urlStr = typeof url === "string" ? url : url instanceof Request ? url.url : String(url)
        window.postMessage({ source: "ophel-net", type: "req", url: urlStr, body: init?.body }, "*")
        const resp = await orig.apply(window, args)
        const clone = resp.clone()
        clone.text().then((text: string) => window.postMessage({ source: "ophel-net", type: "res", url: urlStr, data: text }, "*"))
        return resp
      }
    }
    const script = document.createElement("script")
    script.textContent = `(${code.toString()})()`
    document.documentElement.appendChild(script)
    script.remove()
    window.addEventListener("message", (ev) => {
      if (ev.data?.source !== "ophel-net") return
      if (ev.data.type === "req") this.reqHandlers.forEach(h => h(ev.data.url, ev.data.body))
      if (ev.data.type === "res") this.resHandlers.forEach(h => h(ev.data.url, ev.data.data))
    })
  }
}
