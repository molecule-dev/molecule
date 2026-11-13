import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for it. */
export const it: Partial<FilesystemTranslations> = {
  'filesystem.error.noProvider':
    "`@molecule/app-filesystem`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `FilesystemProvider` : Molecule non fornisce alcun provider per questo; implementa l'interfaccia nel tuo runtime nativo e collegala.",
}
