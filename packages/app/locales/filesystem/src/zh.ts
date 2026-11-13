import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Chinese. */
export const zh: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`：未设置提供程序。请使用 `FilesystemProvider` 实现调用 `setProvider()` — Molecule 未附带此提供程序；请在原生运行时中实现该接口并进行绑定。',
}
