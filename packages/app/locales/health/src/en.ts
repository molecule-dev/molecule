import type { HealthTranslations } from './types.js'

/** Health translations for English. */
export const en: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}h {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: No health provider bonded — implement the `HealthProvider` interface on your native runtime (Apple HealthKit / Android Health Connect / Google Fit) and bond it with `setProvider()` at startup. Molecule ships no provider for it. Feature-detect with `hasProvider()` or `getCapabilities().supported` before calling — a health read has no honest default, so this throws rather than return fake data.',
}
