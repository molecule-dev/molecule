import type { HealthTranslations } from './types.js'

/** Health translations for Macedonian. */
export const mk: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ч {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Нема поврзан давател на здравствени услуги — имплементирајте го интерфејсот `HealthProvider` на вашето матичко извршување (Apple HealthKit / Android Health Connect / Google Fit) и поврзете го со `setProvider()` при стартување. Molecule не испраќа давател на услуги за тоа. Детектирајте функции со `hasProvider()` или `getCapabilities().supported` пред да го повикате — читањето на здравствениот систем нема искрен стандарден код, па затоа фрла лажни податоци наместо да враќа лажни податоци.',
}
