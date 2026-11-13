import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Chinese (Traditional). */
export const zhTW: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`：未設定提供者。請使用 `FilesystemProvider` 實作呼叫 `setProvider()` — Molecule 未隨附此提供者；請在原生執行環境中實作該介面並加以綁定。',
}
