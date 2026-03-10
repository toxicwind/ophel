# Ophel Repo Inventory

## Stores (`src/stores/*`)

- `anchor-store.ts`: Tracks bidirectional anchors (page ↔ outline).
- `archivist-store.ts` (new): Tracks captured normalized messages and export pipeline state.
- `conversation-store.ts`: Manages conversations, folders, and WebDAV sync states.
- `prompt-store.ts`: Manages the prompt library, categories, and variables.
- `settings-store.ts`: Global application settings, theme preferences, and feature flags.

## UI Entry Points

- **App**: `src/components/App.tsx` (Main shell, Plasmo CS injection point)
- **MainPanel**: `src/components/MainPanel.tsx` (Tab container)
- **Tabs**:
  - `OutlineTab.tsx`: Page structure navigation.
  - `ConversationsTab.tsx`: Conversation history and vault navigation.
  - `PromptsTab.tsx`: Template toolbox.
  - `SettingsTab.tsx` / `SettingsModal.tsx`: Configuration interface.
  - `ArchivistTab.tsx` (new): Capture and export pipeline UI.

## Site Adapters (`src/adapters/*`)

- **Base Adapter** (`base.ts`): Interface for all site adapters (`SiteAdapter`).
- **Implementations**:
  - `chatgpt.ts`: OpenAI ChatGPT UI extraction.
  - `claude.ts`: Anthropic Claude UI extraction.
  - `gemini.ts` / `gemini-enterprise.ts`: Google Gemini extraction.
  - `aistudio.ts`: Google AI Studio extraction.
  - `doubao.ts`: ByteDance Doubao extraction.
  - `deepseek.ts`: DeepSeek extraction.
  - `grok.ts`: xAI Grok extraction.
- **Host Detection**: Handled via `src/content.tsx` and matching logic in adapters.

## Build Scripts

- `pnpm run dev`: Aliased to `plasmo dev --target=firefox-mv3`
- `pnpm run build`: Aliased to `plasmo build --target=firefox-mv3`
- `tools/package-firefox.sh`: deterministic build -> XPI script
- `tools/manifest.sh`: deterministic manifest.json emission
