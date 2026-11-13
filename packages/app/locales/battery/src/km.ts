import type { BatteryTranslations } from './types.js'

/** Battery translations for Khmer. */
export const km: BatteryTranslations = {
  'battery.charging': 'កំពុងសាក',
  'battery.discharging': 'កំពុងប្រើថ្ម',
  'battery.full': 'សាកពេញ',
  'battery.not-charging': 'មិនកំពុងសាក',
  'battery.unknown': 'មិនស្គាល់',
  'battery.remainingUnknown': 'មិនស្គាល់',
  'battery.remainingTime': '{{hours}}ម៉ {{minutes}}ន',
  'battery.remainingMinutes': '{{minutes}}ន',
  'battery.error.noProvider':
    '`@molecule/app-battery`: គ្មាន​អ្នកផ្តល់សេវា​ត្រូវបាន​កំណត់​ទេ។ សូម​ហៅ `setProvider()` ជាមួយនឹង​ការអនុវត្ត `BatteryProvider` — Molecule មិន​ដឹកជញ្ជូន​អ្នកផ្តល់សេវា​សម្រាប់​វា​ទេ។ អនុវត្ត​ចំណុចប្រទាក់​នៅលើ​ពេល​ដំណើរការ​ដើម​របស់អ្នក ហើយ​ភ្ជាប់​វា។',
}
