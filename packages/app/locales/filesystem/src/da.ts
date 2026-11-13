import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Danish. */
export const da: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Ingen provider angivet. Kald `setProvider()` med en `FilesystemProvider` implementering — Molecule sender ingen provider til den; implementer grænsefladen på din native runtime og tilknyt den.',
}
