import type { HealthTranslations } from './types.js'

/** Health translations for Bulgarian. */
export const bg: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ч {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Няма свързан доставчик на здравни услуги — имплементирайте интерфейса `HealthProvider` в собствената си среда за изпълнение (Apple HealthKit / Android Health Connect / Google Fit) и го свържете с `setProvider()` при стартиране. Molecule не предоставя доставчик за него. Откриване на функции с `hasProvider()` или `getCapabilities().supported` преди извикване — четенето на здравни услуги няма честни данни по подразбиране, така че това хвърля, а не връща фалшиви данни.',
}
