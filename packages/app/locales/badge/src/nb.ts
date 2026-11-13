import type { BadgeTranslations } from './types.js'

/** Badge translations for Norwegian Bokmål. */
export const nb: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`: Ingen leverandør angitt. Kall `setProvider()` med en `BadgeProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den.',
}
