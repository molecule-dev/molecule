import type { HealthTranslations } from './types.js'

/** Health translations for Norwegian Bokmål. */
export const nb: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}t {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Ingen helseleverandør tilknyttet – implementer `HealthProvider` grensesnittet på din native runtime (Apple HealthKit / Android Health Connect / Google Fit) og tilknytt det med `setProvider()` ved oppstart. Molecule sender ingen leverandør for det. Funksjonsdetekter med `hasProvider()` eller `getCapabilities().supported` før kall – en helseavlesning har ingen ærlig standard, så dette kaster i stedet for å returnere falske data.',
}
