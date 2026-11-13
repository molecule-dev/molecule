import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Slovenian. */
export const sl: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Ponudnik ni nastavljen. Pokličite `setProvider()` z implementacijo `FilesystemProvider` – Molecule zanj ne ponuja nobenega ponudnika; implementirajte vmesnik v svojem izvornem izvajalnem okolju in ga povežite.',
}
