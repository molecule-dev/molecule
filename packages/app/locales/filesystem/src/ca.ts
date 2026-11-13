import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for ca. */
export const ca: Partial<FilesystemTranslations> = {
  'filesystem.error.noProvider':
    "`@molecule/app-filesystem`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `FilesystemProvider` — Molecule no envia cap proveïdor; implementa la interfície al teu temps d'execució natiu i vincula-la.",
}
