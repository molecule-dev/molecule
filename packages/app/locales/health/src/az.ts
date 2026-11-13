import type { HealthTranslations } from './types.js'

/** Health translations for Azerbaijani. */
export const az: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}s {{minutes}}d',
  'health.durationMinutes': '{{minutes}}d',
  'health.error.noProvider':
    '`@molecule/app-health`: Heç bir sağlamlıq təminatçısı bağlı deyil — `HealthProvider` interfeysini yerli işləmə müddətinizdə (Apple HealthKit / Android Health Connect / Google Fit) tətbiq edin və başlanğıcda `setProvider()` ilə əlaqələndirin. Molecule bunun üçün heç bir təminatçı göndərmir. Zəng etməzdən əvvəl `hasProvider()` və ya `getCapabilities().supported` ilə xüsusiyyət aşkarlayın — sağlamlıq oxunuşunda dürüst standart yoxdur, buna görə də bu, saxta məlumatlar qaytarmaq əvəzinə, onları ötürür.',
}
