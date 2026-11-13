import type { HealthTranslations } from './types.js'

/** Health translations for Zulu. */
export const zu: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Akekho umhlinzeki wezempilo oboshiwe — sebenzisa isikhombimsebenzisi se `HealthProvider` ngesikhathi sakho sokusebenza (i-Apple HealthKit / i-Android Health Connect / i-Google Fit) bese usibopha nge `setProvider()` ekuqaleni. Akekho umhlinzeki othumela ngemikhumbi. Ukuthola izici nge `hasProvider()` noma `getCapabilities().supported` ngaphambi kokushaya ucingo — ukufunda impilo akunawo umgomo oqondile, ngakho-ke lokhu kulahla kunokubuyisela idatha engamanga.',
}
