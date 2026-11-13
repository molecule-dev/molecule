import type { HealthTranslations } from './types.js'

/** Health translations for id. */
export const id: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}mnt',
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Tidak ada penyedia kesehatan yang terikat — implementasikan antarmuka `HealthProvider` pada runtime asli Anda (Apple HealthKit / Android Health Connect / Google Fit) dan ikat dengan `setProvider()` saat startup. Molecule tidak menyediakan penyedia untuk itu. Deteksi fitur dengan `hasProvider()` atau `getCapabilities().supported` sebelum memanggil — pembacaan kesehatan tidak memiliki nilai default yang sebenarnya, jadi ini akan melempar pengecualian daripada mengembalikan data palsu.',
}
