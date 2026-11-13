import type { HealthTranslations } from './types.js'

/** Health translations for Bosnian. */
export const bs: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Nijedan zdravstveni pružatelj nije povezan — implementirajte `HealthProvider` interfejs na vašem izvornom okruženju za izvršavanje (Apple HealthKit / Android Health Connect / Google Fit) i povežite ga sa `setProvider()` pri pokretanju. Nijedan pružatelj ne dolazi s flotom. Detekcija funkcija sa `hasProvider()` ili `getCapabilities().supported` prije pozivanja — očitavanje zdravlja nema poštenu zadanu vrijednost, tako da ovo baca umjesto da vraća lažne podatke.',
}
