import type { HealthTranslations } from './types.js'

/** Health translations for Maltese. */
export const mt: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}s {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    "`@molecule/app-health`: L-ebda fornitur tas-saħħa ma huwa marbut — implimenta l-interface `HealthProvider` fuq ir-runtime nattiv tiegħek (Apple HealthKit / Android Health Connect / Google Fit) u għaqqadha ma `setProvider()` fil-bidu. L-ebda fornitur ma jiġi mal-flotta. Sejbien tal-karatteristiċi `hasProvider()` jew `getCapabilities().supported` qabel ma ssejjaħ — qari tas-saħħa m'għandux default onest, għalhekk dan jitfa' minflok ma jirritorna dejta falza.",
}
