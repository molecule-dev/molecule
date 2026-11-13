import type { HealthTranslations } from './types.js'

/** Health translations for Lithuanian. */
export const lt: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}val {{minutes}}min',
  'health.durationMinutes': '{{minutes}}min',
  'health.error.noProvider':
    '`@molecule/app-health`: Sveikatos priežiūros paslaugų teikėjas nesujungtas – įdiekite `HealthProvider` sąsają savo gimtojoje vykdymo aplinkoje („Apple HealthKit“ / „Android Health Connect“ / „Google Fit“) ir susiekite ją su `setProvider()` paleidimo metu. Įrenginių parke nėra tiekėjo. Funkcijų aptikimas naudojant `hasProvider()` arba `getCapabilities().supported` prieš iškviečiant – sveikatos nuskaitymas neturi sąžiningų numatytųjų reikšmių, todėl tai išmeta, o ne grąžina suklastotus duomenis.',
}
