import type { HealthTranslations } from './types.js'

/** Health translations for Basque. */
export const eu: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}o {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Ez dago osasun-hornitzailerik lotuta — inplementatu `HealthProvider` interfazea zure jatorrizko exekuzio-denboran (Apple HealthKit / Android Health Connect / Google Fit) eta lotu `setProvider()` -rekin abiaraztean. Ez dago flotarekin batera datorren hornitzailerik. Ezaugarriak detektatu `hasProvider()` edo `getCapabilities().supported` erabiliz deitu aurretik — osasun-irakurketa batek ez du lehenetsi zintzorik, beraz, honek datu faltsuak itzuli beharrean botatzen ditu.',
}
