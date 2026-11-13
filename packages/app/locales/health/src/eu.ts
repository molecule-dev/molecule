import type { HealthTranslations } from './types.js'

/** Health translations for Basque. */
export const eu: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}o {{minutes}}m',
  'health.durationMinutes': '{{minutes}}m',
  'health.error.noProvider':
    '`@molecule/app-health`: Ez dago osasun-hornitzailerik lotuta — inplementatu `HealthProvider` interfazea zure jatorrizko exekuzio-denboran (Apple HealthKit / Android Health Connect / Google Fit) eta lotu `setProvider()`-rekin abiaraztean. Molecule-k ez du hornitzailerik bidaltzen horretarako. Ezaugarri-detekzioa egin `hasProvider()` edo `getCapabilities().supported` ekin deitu aurretik — osasun-irakurketa batek ez du lehenetsitako zintzotasunik, beraz, honek datu faltsuak itzuli beharrean botatzen ditu.',
}
