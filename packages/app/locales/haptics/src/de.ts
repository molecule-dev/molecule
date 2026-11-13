import type { HapticsTranslations } from './types.js'

/** Haptics translations for German. */
export const de: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `HapticsProvider`-Implementierung auf – Molecule liefert keinen Provider dafür; implementieren Sie die Schnittstelle in Ihrer nativen Laufzeitumgebung und binden Sie sie ein.',
}
