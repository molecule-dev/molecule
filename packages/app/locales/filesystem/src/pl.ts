import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Polish. */
export const pl: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Nie ustawiono dostawcy. Wywołaj `setProvider()` z implementacją `FilesystemProvider` — Molecule nie dostarcza dla niego żadnego dostawcy; zaimplementuj interfejs w swoim natywnym środowisku wykonawczym i powiąż go.',
}
