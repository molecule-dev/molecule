import type { HealthTranslations } from './types.js'

/** Health translations for Ukrainian. */
export const uk: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}год {{minutes}}хв',
  'health.durationMinutes': '{{minutes}}хв',
  'health.error.noProvider':
    "`@molecule/app-health`: Немає пов'язаного постачальника медичних послуг — реалізуйте інтерфейс `HealthProvider` у вашому рідному середовищі виконання (Apple HealthKit / Android Health Connect / Google Fit) та пов'яжіть його з `setProvider()` під час запуску. Постачальник не постачається разом із парком послуг. Визначте функції за допомогою `hasProvider()` або `getCapabilities().supported` перед викликом — зчитування даних про стан здоров'я не має чесних значень за замовчуванням, тому це викидає, а не повертає фальшиві дані.",
}
