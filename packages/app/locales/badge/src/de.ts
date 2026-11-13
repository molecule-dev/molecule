import type { BadgeTranslations } from './types.js'

/** Badge translations for German. */
export const de: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `BadgeProvider`-Implementierung auf – Molecule liefert keinen Provider dafür; implementieren Sie die Schnittstelle in Ihrer nativen Laufzeitumgebung und binden Sie sie ein.',
}
