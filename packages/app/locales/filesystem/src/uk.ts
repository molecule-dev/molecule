import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Ukrainian. */
export const uk: FilesystemTranslations = {
  'filesystem.error.noProvider':
    "`@molecule/app-filesystem`: Постачальника не встановлено. Викличте `setProvider()` з реалізацією `FilesystemProvider` — Molecule не надає для нього жодного постачальника; реалізуйте інтерфейс у вашому рідному середовищі виконання та зв'яжіть його.",
}
