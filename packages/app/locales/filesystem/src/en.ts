import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for English. */
export const en: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: No provider set. Call `setProvider()` with a `FilesystemProvider` implementation — Molecule ships no provider for it; implement the interface on your native runtime and bond it.',
}
