import type { HealthTranslations } from './types.js'

/** Health translations for Finnish. */
export const fi: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}t {{minutes}}min',
  'health.durationMinutes': '{{minutes}}min',
  'health.error.noProvider':
    '`@molecule/app-health`: Ei terveyspalveluntarjoajaa yhdistettynä — toteuta `HealthProvider` rajapinta natiivissa suoritusympäristössäsi (Apple HealthKit / Android Health Connect / Google Fit) ja yhdistä se `setProvider()` -funktiolla käynnistyksen yhteydessä. Laivaston mukana ei toimiteta palveluntarjoajaa. Tunnista ominaisuudet `hasProvider()` tai `getCapabilities().supported` ennen kutsua — terveystietojen lukemisella ei ole rehellistä oletusarvoa, joten tämä heittää palauttamisen sijaan väärennettyä dataa.',
}
