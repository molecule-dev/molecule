import type { HealthTranslations } from './types.js'

/** Health translations for Hausa. */
export const ha: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}sa {{minutes}}min',
  'health.durationMinutes': '{{minutes}}min',
  'health.error.noProvider':
    '`@molecule/app-health`: Babu wani mai bada sabis na kiwon lafiya da aka haɗa — aiwatar da hanyar haɗin `HealthProvider` akan lokacin aiki na asali (Apple HealthKit / Android Health Connect / Google Fit) kuma haɗa shi da `setProvider()` a lokacin farawa. Babu mai bada sabis da ke jigilar kayan aiki. Gano fasalin tare da `hasProvider()` ko `getCapabilities().supported` kafin kira — karanta lafiya ba shi da ainihin asali, don haka wannan yana jefa maimakon dawo da bayanan karya.',
}
