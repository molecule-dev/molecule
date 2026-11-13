import type { HealthTranslations } from './types.js'

/** Health translations for Malay. */
export const ms: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}j {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Tiada pembekal kesihatan yang terikat — laksanakan antara muka `HealthProvider` pada masa jalan asal anda (Apple HealthKit / Android Health Connect / Google Fit) dan ikatkannya dengan `setProvider()` semasa permulaan. Molecule tidak menghantar sebarang pembekal untuknya. Kesan ciri dengan `hasProvider()` atau `getCapabilities().supported` sebelum memanggil — bacaan kesihatan tidak mempunyai lalai jujur, jadi ini akan membuang dan bukannya mengembalikan data palsu.',
}
