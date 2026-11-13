import type { HapticsTranslations } from './types.js'

/** Haptics translations for ca. */
export const ca: Partial<HapticsTranslations> = {
  'haptics.error.noProvider':
    "`@molecule/app-haptics`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `HapticsProvider` — Molecule no envia cap proveïdor; implementa la interfície al teu temps d'execució natiu i vincula-la.",
}
