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
    '`@molecule/app-battery`: គ្មានអ្នកផ្តល់សេវាណាមួយត្រូវបានកំណត់ទេ។ សូមហៅ `setProvider()` ជាមួយនឹងការអនុវត្ត `BatteryProvider` — គ្មានអ្នកផ្តល់សេវាណាម្នាក់ដឹកជញ្ជូនជាមួយកងនាវាទេ។ អនុវត្តចំណុចប្រទាក់នៅលើពេលដំណើរការដើមរបស់អ្នក ហើយភ្ជាប់វា។',
}
