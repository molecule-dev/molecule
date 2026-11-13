import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Bulgarian. */
export const bg: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Няма зададен доставчик. Извикайте `setProvider()` с имплементация на `FilesystemProvider` — Molecule не предоставя доставчик за него; имплементирайте интерфейса в собствената си среда за изпълнение и го свържете.',
}
