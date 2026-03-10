# Hypebrut Loom / Ophel Fork – Discovery Report

Generated: Tue Mar 10 03:14:29 PM UTC 2026

## Entry Points

src/background.ts
src/popup.tsx
src/vite-env.d.ts

## Stores

anchor-store.ts
bookmarks-store.ts
chrome-adapter.ts
claude-sessionkeys-store.ts
conversations-store.ts
folders-store.ts
prompts-store.ts
queue-store.ts
reading-history-store.ts
settings-store.ts
tags-store.ts

## Adapters

aistudio.ts
base.ts
chatgpt.ts
claude.ts
deepseek.ts
doubao.ts
gemini-enterprise.ts
gemini.ts
grok.ts
index.ts

## Archivist Modules (new)

src/archivist/exporters/index.ts
src/archivist/pipeline.ts
src/archivist/providers/adapter.ts
src/archivist/providers/chatgpt_api.ts
src/archivist/providers/dom_capture.ts
src/archivist/selector.ts
src/archivist/sinks.ts
src/archivist/stream.ts
src/archivist/templates/toolbox.ts
src/archivist/types.ts
src/archivist/ui/OutlineSelect.css
src/archivist/ui/OutlineSelect.tsx

## Tabs

options
options.css
options.tsx
perm-request.tsx

## Export Utils

src/utils/backup-validator.ts
src/utils/config.ts
src/utils/dom-toolkit.ts
src/utils/exporter.ts
src/utils/format.ts
src/utils/getStoreInfo.tsx
src/utils/history-loader.ts
src/utils/i18n.ts
src/utils/icons.ts
src/utils/markdown.ts
src/utils/messaging.ts
src/utils/scroll-helper.ts
src/utils/storage.ts
src/utils/themes/dark/index.ts
src/utils/themes/helpers.ts
src/utils/themes/index.ts
src/utils/themes/light/index.ts
src/utils/themes.ts
src/utils/themes/types.ts
src/utils/toast.ts
src/utils/trusted-types.ts

## WebDAV / Sync

/\*\*

- WebDAV 同步管理器
- 支持将本地数据同步到 WebDAV 服务器（如坚果云、Nextcloud 等）
  \*/

import { MULTI_PROP_STORES, ZUSTAND_KEYS } from "~constants/defaults"
import { validateBackupData } from "~utils/backup-validator"
import { APP_NAME } from "~utils/config"
import { MSG_WEBDAV_REQUEST } from "~utils/messaging"

function safeDecodeURIComponent(str: string) {
try {
return decodeURIComponent(str)
} catch {
return str
}
}

// WebDAV 配置接口
export interface WebDAVConfig {
enabled: boolean
url: string // WebDAV 服务器地址，如 https://dav.jianguoyun.com/dav/
username: string
password: string // 应用专用密码
syncMode: "manual" | "auto"
syncInterval: number // 自动同步间隔（分钟）
remoteDir: string // 远程备份目录，如 /backup
lastSyncTime?: number // 上次同步时间戳
lastSyncStatus?: "success" | "failed" | "syncing"
}

export const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
enabled: false,
url: "",
username: "",
password: "",
syncMode: "manual",
syncInterval: 30,
remoteDir: APP_NAME,
}

/\*\*

- 生成备份文件名
- 格式：{appName}_backup_{timestamp}.json
  \*/
  function generateBackupFileName(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hour = String(now.getHours()).padStart(2, "0")
  const minute = String(now.getMinutes()).padStart(2, "0")
  const second = String(now.getSeconds()).padStart(2, "0")

const timestamp = `${year}-${month}-${day}_${hour}-${minute}-${second}`
return `${APP_NAME}_backup_${timestamp}.json`
}

// 同步结果
export interface SyncResult {

## Platform Abstraction

/\*\*

- Platform Abstraction Layer - Entry Point
-
- 根据构建目标自动选择平台实现
-
- 构建时通过 DefinePlugin 注入 **PLATFORM** 变量：
- - 浏览器扩展：**PLATFORM** = "extension"
- - 油猴脚本：**PLATFORM** = "userscript"
    \*/

// 静态导入两个平台的实现 (依靠 tree-shaking 移除未使用的代码)
import { platform as extensionPlatform } from "./extension"
import type { Platform } from "./types"
import { platform as userscriptPlatform } from "./userscript"

// 构建时注入的平台标识
declare const **PLATFORM**: "extension" | "userscript"

// 动态导入对应平台实现
let platform: Platform

// 默认使用扩展版（Plasmo 构建时不会定义 **PLATFORM**）
if (typeof **PLATFORM** !== "undefined" && **PLATFORM** === "userscript") {
// 油猴脚本构建
platform = userscriptPlatform
} else {
// 浏览器扩展构建（默认）
platform = extensionPlatform
}

export { platform }
export type {
Platform,
PlatformStorage,
PlatformCapability,
FetchOptions,
FetchResponse,
NotifyOptions,
} from "./types"

## Build Scripts

dev : plasmo dev
lint : eslint . --fix
lint:check : eslint .
format : prettier --write .
format:check : prettier --check .
typecheck : tsc --noEmit
build : plasmo build
build:firefox : plasmo build --target=firefox-mv3
build:all : plasmo build && plasmo build --target=firefox-mv3
package : plasmo package
package:firefox : plasmo package --target=firefox-mv3
package:all : plasmo package && plasmo package --target=firefox-mv3
dev:userscript : vite --config vite.userscript.config.ts
build:userscript : vite build --config vite.userscript.config.ts
docs:dev : vitepress dev docs
docs:build : vitepress build docs
docs:preview : vitepress preview docs
prepare : husky

## Firefox-specific

    "build:firefox": "plasmo build --target=firefox-mv3",
    "build:all": "plasmo build && plasmo build --target=firefox-mv3",
    "package:firefox": "plasmo package --target=firefox-mv3",
    "package:all": "plasmo package && plasmo package --target=firefox-mv3",
      "gecko": {
