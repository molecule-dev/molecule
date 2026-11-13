import type { HealthTranslations } from './types.js'

/** Health translations for Swahili. */
export const sw: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}s {{minutes}}d',
  'health.durationMinutes': '{{minutes}}d',
  'health.error.noProvider':
    '`@molecule/app-health`: Hakuna mtoa huduma wa afya aliyeunganishwa — tekeleza kiolesura cha `HealthProvider` kwenye muda wako asilia wa utekelezaji (Apple HealthKit / Android Health Connect / Google Fit) na uiunganishe na `setProvider()` wakati wa kuanza. Hakuna mtoa huduma anayesafirisha na kundi la meli. Gundua vipengele kwa kutumia `hasProvider()` au `getCapabilities().supported` kabla ya kupiga simu — usomaji wa afya hauna chaguo-msingi la uaminifu, kwa hivyo hii hutupa badala ya kurudisha data bandia.',
}
