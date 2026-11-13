import type { HealthTranslations } from './types.js'

/** Health translations for Filipino. */
export const fil: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}o {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Walang health provider na naka-bond — ipatupad ang `HealthProvider` interface sa iyong native runtime (Apple HealthKit / Android Health Connect / Google Fit) at i-bond ito sa `setProvider()` sa startup. Walang provider na ipinapadala ang Molecule para dito. Feature-detect gamit ang `hasProvider()` o `getCapabilities().supported` bago tumawag — ang health read ay walang honest default, kaya pekeng data ang itinatapon nito sa halip na ibinabalik.',
}
