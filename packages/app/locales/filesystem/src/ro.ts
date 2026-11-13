import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Romanian. */
export const ro: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Niciun furnizor setat. Apelați `setProvider()` cu o implementare a `FilesystemProvider` — Molecule nu oferă niciun furnizor pentru aceasta; implementați interfața pe runtime-ul nativ și conectați-o la un link.',
}
