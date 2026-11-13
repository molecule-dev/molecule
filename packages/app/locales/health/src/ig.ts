import type { HealthTranslations } from './types.js'

/** Health translations for Igbo. */
export const ig: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ch {{minutes}}nk',
  'health.durationMinutes': '{{minutes}}nk',
  'health.error.noProvider':
    "`@molecule/app-health`: Enweghị onye na-enye ọrụ ahụike ejikọtara — tinye interface `HealthProvider` n'oge ọrụ gị (Apple HealthKit / Android Health Connect / Google Fit) ma jikọọ ya na `setProvider()` na mmalite. Ọ dịghị onye na-enye ọrụ na-ebuga ya na ndị ọrụ. Chọpụta njirimara site na `hasProvider()` ma ọ bụ `getCapabilities().supported` tupu ịkpọ oku — ịgụ ahụike enweghị ndabara ziri ezi, yabụ nke a na-atụba kama iweghachite data adịgboroja.",
}
