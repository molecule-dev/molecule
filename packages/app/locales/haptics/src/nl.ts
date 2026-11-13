import type { HapticsTranslations } from './types.js'

/** Haptics translations for Dutch. */
export const nl: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Geen provider ingesteld. Roep `setProvider()` aan met een `HapticsProvider` implementatie — Molecule levert geen provider hiervoor; implementeer de interface in uw eigen runtime en koppel deze.',
}
