import type { HealthTranslations } from './types.js'

/** Health translations for Italian. */
export const it: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    "`@molecule/app-health`: Nessun provider di salute associato: implementa l'interfaccia `HealthProvider` nel tuo runtime nativo (Apple HealthKit / Android Health Connect / Google Fit) e associala con `setProvider()` all'avvio. Nessun provider viene fornito con la flotta. Rileva le funzionalità con `hasProvider()` o `getCapabilities().supported` prima di chiamare: una lettura dello stato di salute non ha un valore predefinito onesto, quindi questo genera un'eccezione invece di restituire dati falsi.",
}
