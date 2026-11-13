import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Swedish. */
export const sv: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Ingen provider angiven. Anropa `setProvider()` med en `FilesystemProvider`-implementering — Molecule levererar ingen provider för den; implementera gränssnittet på din native runtime och koppla den.',
}
