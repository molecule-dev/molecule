import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Portuguese. */
export const pt: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Nenhum provedor definido. Chame `setProvider()` com uma implementação de `FilesystemProvider` — o Molecule não fornece um provedor para isso; implemente a interface em seu ambiente de execução nativo e faça a vinculação.',
}
