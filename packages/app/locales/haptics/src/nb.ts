import type { HapticsTranslations } from './types.js'

/** Haptics translations for Norwegian Bokmål. */
export const nb: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: Ingen leverandør angitt. Kall `setProvider()` med en `HapticsProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den.',
}
