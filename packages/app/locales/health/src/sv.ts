import type { HealthTranslations } from './types.js'

/** Health translations for sv. */
export const sv: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}min',
  'health.durationHoursMinutes': '{{hours}} h {{minutes}} m',
  'health.error.noProvider':
    '`@molecule/app-health`: Ingen hälsovårdsleverantör kopplad — implementera `HealthProvider` gränssnittet på din native runtime (Apple HealthKit / Android Health Connect / Google Fit) och koppla det med `setProvider()` vid start. Ingen leverantör levereras med flottan. Funktionsidentifiera med `hasProvider()` eller `getCapabilities().supported` före anrop — en hälsoavläsning har ingen ärlig standard, så detta kastar snarare än returnerar falska data.',
}
