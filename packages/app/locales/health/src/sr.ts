import type { HealthTranslations } from './types.js'

/** Health translations for Serbian. */
export const sr: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ч {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Није повезан са здравственим добављачем — имплементирајте интерфејс `HealthProvider` на вашем изворном окружењу за извршавање (Apple HealthKit / Android Health Connect / Google Fit) и повежите га са `setProvider()` при покретању. Molecule не испоручује никаквог добављача за њега. Детекција функција са `hasProvider()` или `getCapabilities().supported` пре позивања — читање здравствених података нема искрен подразумевани подешавање, тако да ово баца уместо да враћа лажне податке.',
}
