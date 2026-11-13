import type { HapticsTranslations } from './types.js'

/** Haptics translations for Danish. */
export const da: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Ingen provider angivet. Kald `setProvider()` med en `HapticsProvider` implementering — Molecule leverer ingen provider til den; implementer grænsefladen på din native runtime og opret en tilknytning til den.',
}
