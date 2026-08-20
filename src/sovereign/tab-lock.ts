import { platform } from "~platform"

const TAB_LOCK_KEY = "ophel:sovereign:tabLock"
const TAB_HEARTBEAT_INTERVAL = 3000
const TAB_LOCK_TTL = 10000

interface LockPayload { tabId: string; timestamp: number; url: string }
function genTabId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }

export interface TabLockState { isLocked: boolean; ownerTab: string | null }

export class TabLock {
  private tabId = genTabId()
  private timer: ReturnType<typeof setInterval> | null = null
  private state: TabLockState = { isLocked: false, ownerTab: null }

  async claim(): Promise<boolean> {
    const now = Date.now()
    const existing = await platform.storage.get<LockPayload>(TAB_LOCK_KEY)
    if (existing && now - existing.timestamp < TAB_LOCK_TTL && existing.tabId !== this.tabId) {
      this.state = { isLocked: true, ownerTab: existing.tabId }
      return false
    }
    await platform.storage.set(TAB_LOCK_KEY, { tabId: this.tabId, timestamp: now, url: location.href })
    this.state = { isLocked: true, ownerTab: this.tabId }
    this.startHb()
    return true
  }

  async release(): Promise<void> {
    const existing = await platform.storage.get<LockPayload>(TAB_LOCK_KEY)
    if (existing?.tabId === this.tabId) await platform.storage.remove(TAB_LOCK_KEY)
    this.stopHb()
    this.state = { isLocked: false, ownerTab: null }
  }

  async isSafe(): Promise<boolean> {
    const now = Date.now()
    const existing = await platform.storage.get<LockPayload>(TAB_LOCK_KEY)
    if (!existing) return true
    if (now - existing.timestamp > TAB_LOCK_TTL) return true
    return existing.tabId === this.tabId
  }

  private startHb(): void {
    if (this.timer) return
    this.timer = setInterval(async () => {
      const existing = await platform.storage.get<LockPayload>(TAB_LOCK_KEY)
      if (existing?.tabId === this.tabId) await platform.storage.set(TAB_LOCK_KEY, { ...existing, timestamp: Date.now() })
    }, TAB_HEARTBEAT_INTERVAL)
  }

  private stopHb(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }
}
