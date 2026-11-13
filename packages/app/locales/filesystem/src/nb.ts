import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Norwegian Bokmål. */
export const nb: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Ingen leverandør angitt. Kall `setProvider()` med en `FilesystemProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den til.',
}
