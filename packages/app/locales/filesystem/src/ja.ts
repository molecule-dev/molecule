import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Japanese. */
export const ja: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: プロバイダーが設定されていません。`FilesystemProvider` の実装を `setProvider()` で設定してください — Molecule にはこのプロバイダーが含まれていないため、ネイティブランタイム上でインターフェースを実装してボンドしてください。',
}
