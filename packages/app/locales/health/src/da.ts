import type { HealthTranslations } from './types.js'

/** Health translations for Danish. */
export const da: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}t {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Ingen sundhedsudbyder tilknyttet — implementer `HealthProvider` grænsefladen på din native runtime (Apple HealthKit / Android Health Connect / Google Fit) og tilknyt den med `setProvider()` ved opstart. Ingen udbyder følger med flåden. Funktionsdetekter med `hasProvider()` eller `getCapabilities().supported` før kald — en sundhedsaflæsning har ingen ærlig standard, så dette kaster falske data i stedet for at returnere dem.',
}
