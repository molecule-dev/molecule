import type { CalendarTranslations } from './types.js'

/** Calendar translations for English. */
export const en: CalendarTranslations = {
  'calendar.error.noProvider':
    '`@molecule/app-device-calendar`: No provider set. Call `setProvider()` with a `CalendarProvider` implementation — Molecule ships no provider for it; implement the interface on your native runtime and bond it.',
}
