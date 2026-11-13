import type { HealthTranslations } from './types.js'

/** Health translations for Welsh. */
export const cy: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}a {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    "`@molecule/app-health`: Dim darparwr iechyd wedi'i fondio — gweithredwch y rhyngwyneb `HealthProvider` ar eich amser rhedeg brodorol (Apple HealthKit / Android Health Connect / Google Fit) a'i fondio â `setProvider()` wrth gychwyn. Nid oes unrhyw ddarparwr yn dod gyda'r fflyd. Canfod nodweddion gyda `hasProvider()` neu `getCapabilities().supported` cyn galw — nid oes gan ddarlleniad iechyd unrhyw ragosodiad gonest, felly mae hyn yn taflu data ffug yn hytrach na'i ddychwelyd.",
}
