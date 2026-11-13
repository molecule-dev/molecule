import type { CalendarTranslations } from './types.js'

/** Calendar translations for it. */
export const it: Partial<CalendarTranslations> = {
  'calendar.error.noProvider':
    "`@molecule/app-device-calendar`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione `CalendarProvider` : Molecule non fornisce alcun provider per questo; implementa l'interfaccia sul tuo runtime nativo e collegala.",
}
