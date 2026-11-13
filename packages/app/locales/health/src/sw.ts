import type { HealthTranslations } from './types.js'

/** Health translations for Swahili. */
export const sw: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}s {{minutes}}d',
  'health.durationMinutes': '{{minutes}}d',
  'health.error.noProvider':
    '`@molecule/app-health`: Hakuna mtoa huduma wa afya aliyeunganishwa — tekeleza kiolesura cha `HealthProvider` kwenye muda wako asilia wa utekelezaji (Apple HealthKit / Android Health Connect / Google Fit) na uiunganishe na `setProvider()` wakati wa kuanza. Molekuli haitoi mtoa huduma yeyote kwa ajili yake. Gundua vipengele kwa kutumia `hasProvider()` au `getCapabilities().supported` kabla ya kupiga simu — usomaji wa afya hauna chaguo-msingi la kweli, kwa hivyo hii hutupa badala ya kurudisha data bandia.',
}
