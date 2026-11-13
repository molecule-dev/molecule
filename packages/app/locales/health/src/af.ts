import type { HealthTranslations } from './types.js'

/** Health translations for Afrikaans. */
export const af: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}u {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    "`@molecule/app-health`: Geen gesondheidsverskaffer gekoppel nie — implementeer die `HealthProvider` koppelvlak op jou oorspronklike looptyd (Apple HealthKit / Android Health Connect / Google Fit) en koppel dit met `setProvider()` tydens opstart. Geen verskaffer word saam met die vloot gestuur nie. Kenmerk-opsporing met `hasProvider()` of `getCapabilities().supported` voor oproep — 'n gesondheidslesing het geen eerlike verstekwaarde nie, so dit gooi eerder as om vals data terug te gee.",
}
