import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for German. */
export const de: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `FilesystemProvider`-Implementierung auf – Molecule liefert keinen Provider dafür; implementieren Sie die Schnittstelle in Ihrer nativen Laufzeitumgebung und binden Sie sie ein.',
}
