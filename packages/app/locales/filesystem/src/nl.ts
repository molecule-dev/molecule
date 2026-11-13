import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Dutch. */
export const nl: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Geen provider ingesteld. Roep `setProvider()` aan met een `FilesystemProvider` implementatie — Molecule levert geen provider hiervoor; implementeer de interface in uw eigen runtime en koppel deze.',
}
