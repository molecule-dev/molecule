import type { CalendarTranslations } from './types.js'

/** Calendar translations for Danish. */
export const da: CalendarTranslations = {
  'calendar.error.noProvider':
    '`@molecule/app-device-calendar`: Ingen provider angivet. Kald `setProvider()` med en `CalendarProvider` implementering — Molecule sender ingen provider til den; implementer grænsefladen på din native runtime og opret en tilknytning til den.',
}
