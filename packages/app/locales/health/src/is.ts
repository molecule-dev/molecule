import type { HealthTranslations } from './types.js'

/** Health translations for Icelandic. */
export const is: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}klst {{minutes}}mín',
  'health.durationMinutes': '{{minutes}}mín',
  'health.error.noProvider':
    '`@molecule/app-health`: Enginn heilbrigðisveitandi tengdur — útfærið `HealthProvider` viðmótið á innbyggða keyrslutímanum ykkar (Apple HealthKit / Android Health Connect / Google Fit) og tengdið það við `setProvider()` við ræsingu. Molecule sendir engan veitanda fyrir það. Eiginleikagreining með `hasProvider()` eða `getCapabilities().supported` áður en kallað er á það — heilsufarslestur hefur engin sjálfgefin gögn, þannig að þetta kastar frekar en að skila fölsuðum gögnum.',
}
