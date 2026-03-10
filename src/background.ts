import { APP_DISPLAY_NAME } from "~utils/config"
import {
  MSG_CLEAR_ALL_DATA,
  MSG_CHECK_CLAUDE_GENERATING,
  MSG_CHECK_PERMISSION,
  MSG_CHECK_PERMISSIONS,
  MSG_FOCUS_TAB,
  MSG_GET_AISTUDIO_MODELS,
  MSG_GET_CLAUDE_SESSION_KEY,
  MSG_OPEN_OPTIONS_PAGE,
  MSG_OPEN_URL,
  MSG_PROXY_FETCH,
  MSG_REQUEST_PERMISSIONS,
  MSG_RESTORE_DATA,
  MSG_REVOKE_PERMISSIONS,
  MSG_SET_CLAUDE_SESSION_KEY,
  MSG_SHOW_NOTIFICATION,
  MSG_SWITCH_NEXT_CLAUDE_KEY,
  MSG_TEST_CLAUDE_TOKEN,
  MSG_WEBDAV_REQUEST,
  type ExtensionMessage,
} from "~utils/messaging"
import { localStorage, type Settings } from "~utils/storage"
import { registerArchivistBridgeHandler } from "~archivist/native-bridge"

/**
 * Ophel - Background Service Worker
 *
 * 后台服务，处理：
 * - 桌面通知
 * - 标签页管理
 * - 跨标签页消息
 * - 代理请求（图片 Base64 转换等）
 */

chrome.runtime.onInstalled.addListener(() => {
  setupDynamicRules()
})

// Register Archivist Native Messaging Bridge
registerArchivistBridgeHandler()

chrome.permissions.onRemoved.addListener(async (removed) => {
  if (removed.origins && removed.origins.includes("<all_urls>")) {
    const settings = await localStorage.get<Settings>("settings")
    if (settings && settings.content?.watermarkRemoval) {
      settings.content.watermarkRemoval = false
      await localStorage.set("settings", settings)
    }
  }
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-global-url") {
    const settings = await localStorage.get<Settings>("settings")
    const url = settings?.shortcuts?.globalUrl || "https://gemini.google.com"
    chrome.tabs.create({ url, active: true })
  }
})

async function setupDynamicRules() {
  const extensionOrigin = chrome.runtime.getURL("").slice(0, -1) // 移除末尾的 /

  const oldRules = await chrome.declarativeNetRequest.getDynamicRules()
  const oldRuleIds = oldRules.map((rule) => rule.id)
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
  })

  const headerActionHeaders = {
    requestHeaders: [
      {
        header: "Referer",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "https://gemini.google.com/",
      },
      {
        header: "Origin",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "https://gemini.google.com",
      },
    ],
    responseHeaders: [
      {
        header: "Access-Control-Allow-Origin",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: extensionOrigin,
      },
      {
        header: "Access-Control-Allow-Credentials",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "true",
      },
    ],
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1001,
        priority: 2, // 高优先级
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: headerActionHeaders.requestHeaders,
          responseHeaders: headerActionHeaders.responseHeaders,
        },
        condition: {
          excludedInitiatorDomains: ["google.com", "gemini.google.com"],
          urlFilter: "*://*.googleusercontent.com/*",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.IMAGE,
            chrome.declarativeNetRequest.ResourceType.OTHER,
          ],
        },
      },
      {
        id: 1002,
        priority: 2,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: headerActionHeaders.requestHeaders,
          responseHeaders: headerActionHeaders.responseHeaders,
        },
        condition: {
          excludedInitiatorDomains: ["google.com", "gemini.google.com"],
          urlFilter: "*://*.google.com/*",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            chrome.declarativeNetRequest.ResourceType.IMAGE,
            chrome.declarativeNetRequest.ResourceType.OTHER,
          ],
        },
      },
    ],
  })
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  switch (message.type) {
    case MSG_SHOW_NOTIFICATION:
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon.png"),
        title: message.title || APP_DISPLAY_NAME,
        message: message.body || "",
        silent: true, // 禁用系统默认通知声音，由扩展自行播放自定义声音
      })
      sendResponse({ success: true })
      break

    case MSG_FOCUS_TAB:
      if (sender.tab?.id) {
        chrome.tabs.update(sender.tab.id, { active: true })
        if (sender.tab.windowId) {
          chrome.windows.update(sender.tab.windowId, { focused: true })
        }
      }
      sendResponse({ success: true })
      break

    case MSG_PROXY_FETCH:
      ;(async () => {
        try {
          const rules = await chrome.declarativeNetRequest.getDynamicRules()
          if (!rules || rules.length === 0 || !rules.find((r) => r.id === 1001)) {
            await setupDynamicRules()
          }

          const response = await fetch(message.url, {
            credentials: "include",
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const blob = await response.blob()
          const reader = new FileReader()
          reader.onloadend = () => {
            sendResponse({ success: true, data: reader.result })
          }
          reader.onerror = () => {
            sendResponse({ success: false, error: "Failed to read blob" })
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.error("Proxy fetch failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_WEBDAV_REQUEST:
      ;(async () => {
        try {
          const { method, url, body, headers, auth } = message as any
          const fetchHeaders: Record<string, string> = { ...headers }

          if (auth?.username && auth?.password) {
            const credentials = btoa(`${auth.username}:${auth.password}`)
            fetchHeaders["Authorization"] = `Basic ${credentials}`
          }

          const response = await fetch(url, {
            method,
            headers: fetchHeaders,
            body: body || undefined,
          })

          const responseText = await response.text()

          sendResponse({
            success: true,
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            headers: Object.fromEntries(response.headers.entries()),
          })
        } catch (err) {
          console.error("WebDAV request failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_CHECK_PERMISSION:
      ;(async () => {
        try {
          const { origin } = message as any
          const hasPermission = await chrome.permissions.contains({
            origins: [origin],
          })
          sendResponse({ success: true, hasPermission })
        } catch (err) {
          console.error("Permission check failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_CHECK_PERMISSIONS:
      ;(async () => {
        try {
          const { origins, permissions } = message as any
          const hasPermission = await chrome.permissions.contains({
            origins,
            permissions,
          })
          sendResponse({ success: true, hasPermission })
        } catch (err) {
          console.error("Permissions check failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_REVOKE_PERMISSIONS:
      ;(async () => {
        try {
          const { origins, permissions } = message as any
          const removed = await chrome.permissions.remove({
            origins,
            permissions,
          })
          sendResponse({ success: true, removed })
        } catch (err) {
          console.error("Permissions revoke failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_REQUEST_PERMISSIONS:
      ;(async () => {
        try {
          const permType = (message as any).permType || "allUrls"
          const url = chrome.runtime.getURL(`tabs/perm-request.html?type=${permType}`)

          const currentWindow = await chrome.windows.getCurrent()
          const width = 450
          const height = 380
          const left = currentWindow.left! + Math.round((currentWindow.width! - width) / 2)
          const top = currentWindow.top! + Math.round((currentWindow.height! - height) / 2)

          await chrome.windows.create({
            url,
            type: "popup",
            width,
            height,
            left,
            top,
            focused: true,
          })

          sendResponse({ success: true })
        } catch (err) {
          console.error("Request permissions flow failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_OPEN_OPTIONS_PAGE:
      ;(async () => {
        try {
          const optionsUrl = chrome.runtime.getURL("tabs/options.html")
          await chrome.tabs.create({
            url: optionsUrl,
            active: true,
          })
          sendResponse({ success: true })
        } catch (err) {
          console.error("Open options page failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_OPEN_URL:
      ;(async () => {
        try {
          const { url } = message as any
          await chrome.tabs.create({
            url,
            active: true,
          })
          sendResponse({ success: true })
        } catch (err) {
          console.error("Open URL failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_CLEAR_ALL_DATA:
      ;(async () => {
        try {
          const targets = [
            "https://gemini.google.com/*",
            "https://business.gemini.google/*",
            "https://aistudio.google.com/*",
            "https://grok.com/*",
            "https://chat.openai.com/*",
            "https://chatgpt.com/*",
            "https://claude.ai/*",
            "https://www.doubao.com/*",
            "https://chat.deepseek.com/*",
          ]
          const tabs = await chrome.tabs.query({ url: targets })
          await Promise.all(
            tabs
              .filter((tab) => tab.id)
              .map((tab) =>
                chrome.tabs
                  .sendMessage(tab.id as number, { type: MSG_CLEAR_ALL_DATA })
                  .catch(() => {}),
              ),
          )
          sendResponse({ success: true, tabs: tabs.length })
        } catch (err) {
          console.error("Broadcast clear all data failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_RESTORE_DATA:
      ;(async () => {
        try {
          const targets = [
            "https://gemini.google.com/*",
            "https://business.gemini.google/*",
            "https://aistudio.google.com/*",
            "https://grok.com/*",
            "https://chat.openai.com/*",
            "https://chatgpt.com/*",
            "https://claude.ai/*",
            "https://www.doubao.com/*",
            "https://chat.deepseek.com/*",
          ]
          const tabs = await chrome.tabs.query({ url: targets })
          await Promise.all(
            tabs
              .filter((tab) => tab.id)
              .map((tab) =>
                chrome.tabs
                  .sendMessage(tab.id as number, { type: MSG_RESTORE_DATA })
                  .catch(() => {}),
              ),
          )
          sendResponse({ success: true, tabs: tabs.length })
        } catch (err) {
          console.error("Broadcast restore data failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_SET_CLAUDE_SESSION_KEY:
      ;(async () => {
        try {
          const { key } = message as any

          if (key) {
            await chrome.cookies.set({
              url: "https://claude.ai",
              name: "sessionKey",
              value: key,
              domain: ".claude.ai",
              path: "/",
              secure: true,
              sameSite: "lax",
            })
          } else {
            await chrome.cookies.remove({
              url: "https://claude.ai",
              name: "sessionKey",
            })
          }

          const claudeTabs = await chrome.tabs.query({ url: "*://claude.ai/*" })
          for (const tab of claudeTabs) {
            if (tab.id) {
              await chrome.tabs.reload(tab.id)
            }
          }

          sendResponse({ success: true, reloadedTabs: claudeTabs.length })
        } catch (err) {
          console.error("Set Claude SessionKey failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_SWITCH_NEXT_CLAUDE_KEY:
      ;(async () => {
        try {
          const storageData = await localStorage.get<any>("claudeSessionKeys")
          const rawKeys = storageData?.state?.keys || []

          if (rawKeys.length === 0) {
            sendResponse({ success: false, error: "No keys found" })
            return
          }

          const currentId = storageData?.state?.currentKeyId

          let availableKeys = rawKeys.filter((k: any) => k.isValid !== false)

          if (availableKeys.length === 0) {
            availableKeys = [...rawKeys]
          }

          availableKeys.sort((a: any, b: any) => {
            const isAPro = a.accountType?.toLowerCase()?.includes("pro")
            const isBPro = b.accountType?.toLowerCase()?.includes("pro")
            if (isAPro && !isBPro) return -1
            if (!isAPro && isBPro) return 1
            return a.name.localeCompare(b.name)
          })

          const currentIndex = availableKeys.findIndex((k: any) => k.id === currentId)

          if (availableKeys.length === 1 && currentIndex !== -1) {
            sendResponse({ success: false, error: "claudeOnlyOneKey" })
            return
          }

          let nextIndex = 0
          if (currentIndex !== -1) {
            nextIndex = (currentIndex + 1) % availableKeys.length
          }

          const nextKey = availableKeys[nextIndex]
          if (!nextKey) {
            sendResponse({ success: false, error: "Next key not found" })
            return
          }

          if (nextKey.key) {
            await chrome.cookies.set({
              url: "https://claude.ai",
              name: "sessionKey",
              value: nextKey.key,
              domain: ".claude.ai",
              path: "/",
              secure: true,
              sameSite: "lax",
            })
          }

          if (storageData?.state) {
            storageData.state.currentKeyId = nextKey.id
            await localStorage.set("claudeSessionKeys", storageData)
          }

          const claudeTabs = await chrome.tabs.query({ url: "*://claude.ai/*" })
          for (const tab of claudeTabs) {
            if (tab.id) {
              await chrome.tabs.update(tab.id, { url: "https://claude.ai/" })
            }
          }

          sendResponse({ success: true, keyName: nextKey.name })
        } catch (err) {
          console.error("Switch Claude SessionKey failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    case MSG_TEST_CLAUDE_TOKEN:
      ;(async () => {
        let originalCookie: chrome.cookies.Cookie | null = null

        try {
          const { sessionKey } = message as any

          const existingCookies = await chrome.cookies.getAll({
            url: "https://claude.ai",
            name: "sessionKey",
          })
          originalCookie = existingCookies.length > 0 ? existingCookies[0] : null

          await chrome.cookies.set({
            url: "https://claude.ai",
            name: "sessionKey",
            value: sessionKey,
            domain: ".claude.ai",
            path: "/",
            secure: true,
            sameSite: "lax",
          })

          const response = await fetch("https://claude.ai/api/organizations", {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
            credentials: "include",
          })

          if (originalCookie) {
            await chrome.cookies.set({
              url: "https://claude.ai",
              name: "sessionKey",
              value: originalCookie.value,
              domain: ".claude.ai",
              path: "/",
              secure: true,
              sameSite: "lax",
            })
          } else {
            await chrome.cookies.remove({
              url: "https://claude.ai",
              name: "sessionKey",
            })
          }

          if (!response.ok) {
            sendResponse({
              success: true,
              isValid: false,
              error: `HTTP ${response.status}`,
            })
            return
          }

          const responseText = await response.text()

          if (responseText.toLowerCase().includes("unauthorized")) {
            sendResponse({
              success: true,
              isValid: false,
              error: "Unauthorized",
            })
            return
          }

          if (!responseText.trim()) {
            sendResponse({
              success: true,
              isValid: false,
              error: "Empty response",
            })
            return
          }

          let orgs
          try {
            orgs = JSON.parse(responseText)
          } catch {
            sendResponse({
              success: true,
              isValid: false,
              error: "Invalid JSON",
            })
            return
          }

          if (!orgs || !Array.isArray(orgs) || orgs.length === 0) {
            sendResponse({
              success: true,
              isValid: false,
              error: "No organizations",
            })
            return
          }

          const org = orgs[0]
          const tier = org?.rate_limit_tier
          const capabilities = org?.capabilities || []
          const apiDisabledReason = org?.api_disabled_reason

          let accountType = "Unknown"
          if (tier === "default_claude_max_5x") {
            accountType = "Max(5x)"
          } else if (tier === "default_claude_max_20x") {
            accountType = "Max(20x)"
          } else if (tier === "default_claude_ai") {
            accountType = "Free"
          } else if (tier === "auto_api_evaluation") {
            accountType = apiDisabledReason === "out_of_credits" ? "API(无额度)" : "API"
          } else if (capabilities.includes("claude_max")) {
            accountType = "Max"
          } else if (capabilities.includes("api")) {
            accountType = "API"
          } else if (capabilities.includes("chat")) {
            accountType = "Free"
          }

          sendResponse({
            success: true,
            isValid: true,
            accountType,
          })
        } catch (err) {
          try {
            if (originalCookie) {
              await chrome.cookies.set({
                url: "https://claude.ai",
                name: "sessionKey",
                value: originalCookie.value,
                domain: ".claude.ai",
                path: "/",
                secure: true,
                sameSite: "lax",
              })
            }
          } catch {}

          console.error("Test Claude Token failed:", err)
          sendResponse({
            success: true,
            isValid: false,
            error: (err as Error).message,
          })
        }
      })()
      break

    case MSG_GET_CLAUDE_SESSION_KEY:
      ;(async () => {
        try {
          const cookies = await chrome.cookies.getAll({
            url: "https://claude.ai",
            name: "sessionKey",
          })

          if (cookies && cookies.length > 0) {
            sendResponse({
              success: true,
              sessionKey: cookies[0].value,
            })
          } else {
            sendResponse({
              success: false,
              error: "未找到sessionKey Cookie",
            })
          }
        } catch (err) {
          console.error("Get Claude SessionKey failed:", err)
          sendResponse({
            success: false,
            error: (err as Error).message,
          })
        }
      })()
      break

    case MSG_CHECK_CLAUDE_GENERATING:
      ;(async () => {
        try {
          const claudeTabs = await chrome.tabs.query({ url: "*://claude.ai/*" })

          if (claudeTabs.length === 0) {
            sendResponse({ success: true, isGenerating: false })
            return
          }

          let isGenerating = false

          for (const tab of claudeTabs) {
            if (!tab.id) continue
            try {
              const result = await chrome.tabs.sendMessage(tab.id, {
                type: "CHECK_IS_GENERATING",
              })
              if (result?.isGenerating) {
                isGenerating = true
                break
              }
            } catch {}
          }

          sendResponse({ success: true, isGenerating })
        } catch (err) {
          console.error("Check Claude generating failed:", err)
          sendResponse({ success: true, isGenerating: false })
        }
      })()
      break

    case MSG_GET_AISTUDIO_MODELS:
      ;(async () => {
        try {
          const aistudioTabs = await chrome.tabs.query({
            url: "*://aistudio.google.com/*",
          })

          if (aistudioTabs.length === 0) {
            sendResponse({
              success: false,
              error: "NO_AISTUDIO_TAB",
              message: "请先打开 AI Studio 页面",
            })
            return
          }

          const tab = aistudioTabs[0]
          if (!tab.id) {
            sendResponse({ success: false, error: "INVALID_TAB" })
            return
          }

          try {
            const result = await chrome.tabs.sendMessage(tab.id, {
              type: "GET_MODEL_LIST",
            })
            sendResponse(result)
          } catch (err) {
            console.error("Send message to AI Studio tab failed:", err)
            sendResponse({
              success: false,
              error: "SEND_MESSAGE_FAILED",
              message: (err as Error).message,
            })
          }
        } catch (err) {
          console.error("Get AI Studio models failed:", err)
          sendResponse({ success: false, error: (err as Error).message })
        }
      })()
      break

    default:
      sendResponse({ success: false, error: "Unknown message type" })
  }

  return true // 保持消息通道打开
})

export {}
