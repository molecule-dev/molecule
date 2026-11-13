import type { HealthTranslations } from './types.js'

/** Health translations for Serbian. */
export const sr: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ч {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Ниједан здравствени добављач није повезан — имплементирајте интерфејс `HealthProvider` на вашем изворном окружењу за извршавање (Apple HealthKit / Android Health Connect / Google Fit) и повежите га са `setProvider()` при покретању. Ниједан добављач се не испоручује са флотом. Детекција функција помоћу `hasProvider()` или `getCapabilities().supported` пре позивања — читање здравствених података нема искрен подразумевани податак, тако да ово баца уместо да враћа лажне податке.',
}
