import type { CalendarTranslations } from './types.js'

/** Calendar translations for Norwegian Bokmål. */
export const nb: CalendarTranslations = {
  'calendar.error.noProvider':
    '`@molecule/app-device-calendar`: Ingen leverandør angitt. Kall `setProvider()` med en `CalendarProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den.',
}
