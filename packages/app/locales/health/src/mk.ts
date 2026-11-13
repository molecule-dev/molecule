import type { HealthTranslations } from './types.js'

/** Health translations for Macedonian. */
export const mk: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ч {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Нема поврзан давател на здравствени услуги — имплементирајте го интерфејсот `HealthProvider` на вашето матичко извршување (Apple HealthKit / Android Health Connect / Google Fit) и поврзете го со `setProvider()` при стартување. Ниеден давател на услуги не се испорачува со флотата. Детектирајте функции со `hasProvider()` или `getCapabilities().supported` пред да се повикате — читањето на здравствениот систем нема искрен стандард, па затоа ова фрла лажни податоци наместо да враќа лажни податоци.',
}
