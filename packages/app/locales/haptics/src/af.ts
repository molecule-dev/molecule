import type { HapticsTranslations } from './types.js'

/** Haptics translations for af. */
export const af: Partial<HapticsTranslations> = {
  'haptics.error.noProvider':
    "`@molecule/app-haptics`: Geen verskaffer gestel nie. Roep `setProvider()` met 'n `HapticsProvider` implementering — Molecule stuur geen verskaffer daarvoor nie; implementeer die koppelvlak op jou oorspronklike looptyd en koppel dit.",
}
