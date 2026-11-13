import type { CalendarTranslations } from './types.js'

/** Calendar translations for ca. */
export const ca: Partial<CalendarTranslations> = {
  'calendar.error.noProvider':
    "`@molecule/app-device-calendar`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `CalendarProvider` — Molecule no envia cap proveïdor; implementa la interfície al teu temps d'execució natiu i vincula-la.",
}
