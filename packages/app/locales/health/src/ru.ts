import type { HealthTranslations } from './types.js'

/** Health translations for Russian. */
export const ru: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ч {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Нет привязанного поставщика медицинских данных — реализуйте интерфейс `HealthProvider` в вашей нативной среде выполнения (Apple HealthKit / Android Health Connect / Google Fit) и привяжите его с помощью `setProvider()` при запуске. Molecule не предоставляет для этого поставщика. Перед вызовом определите наличие функции с помощью `hasProvider()` или `getCapabilities().supported` — чтение данных о состоянии здоровья не имеет честного значения по умолчанию, поэтому это вызовет исключение, а не вернет фиктивные данные.',
}
