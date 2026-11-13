import type { HealthTranslations } from './types.js'

/** Health translations for Bosnian. */
export const bs: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Nije povezan sa pružateljem zdravstvenih usluga — implementirajte `HealthProvider` interfejs na vašem izvornom okruženju za izvršavanje (Apple HealthKit / Android Health Connect / Google Fit) i povežite ga sa `setProvider()` pri pokretanju. Molecule ne isporučuje pružatelja usluga za njega. Detekcija funkcija sa `hasProvider()` ili `getCapabilities().supported` prije pozivanja — čitanje zdravstvenih podataka nema poštenu zadanu vrijednost, tako da ovo baca, a ne vraća lažne podatke.',
}
