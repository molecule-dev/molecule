import type { HealthTranslations } from './types.js'

/** Health translations for Azerbaijani. */
export const az: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}s {{minutes}}d',
  'health.durationMinutes': '{{minutes}}d',
  'health.error.noProvider':
    '`@molecule/app-health`: Heç bir sağlamlıq provayderi bağlı deyil — `HealthProvider` interfeysini doğma iş vaxtınızda (Apple HealthKit / Android Health Connect / Google Fit) tətbiq edin və başlanğıcda `setProvider()` ilə əlaqələndirin. Heç bir provayder donanma ilə göndərilmir. Zəng etməzdən əvvəl `hasProvider()` və ya `getCapabilities().supported` ilə xüsusiyyət aşkarlayın — sağlamlıq oxunuşunda dürüst standart yoxdur, buna görə də bu, saxta məlumatlar qaytarmaq əvəzinə, ötürməni təmin edir.',
}
