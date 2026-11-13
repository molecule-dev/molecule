import type { HealthTranslations } from './types.js'

/** Health translations for Croatian. */
export const hr: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Nije povezan pružatelj zdravstvenih usluga — implementirajte sučelje `HealthProvider` u svoje izvorno okruženje za izvođenje (Apple HealthKit / Android Health Connect / Google Fit) i povežite ga s `setProvider()` pri pokretanju. Molecule ne isporučuje pružatelja usluga za njega. Otkrivanje značajki s `hasProvider()` ili `getCapabilities().supported` prije pozivanja — čitanje zdravstvenih podataka nema poštenu zadanu vrijednost, pa ovo baca, a ne vraća lažne podatke.',
}
