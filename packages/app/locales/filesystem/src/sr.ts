import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Serbian. */
export const sr: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Није подешен провајдер. Позовите `setProvider()` са имплементацијом `FilesystemProvider` — Molecule не испоручује провајдера за то; имплементирајте интерфејс на вашем изворном окружењу за извршавање и повежите га.',
}
