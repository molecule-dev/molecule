import type { BatteryTranslations } from './types.js'

/** Battery translations for Urdu. */
export const ur: BatteryTranslations = {
  'battery.charging': 'چارج ہو رہا ہے',
  'battery.discharging': 'بیٹری پر',
  'battery.full': 'مکمل چارج',
  'battery.not-charging': 'چارج نہیں ہو رہا',
  'battery.unknown': 'نامعلوم',
  'battery.remainingUnknown': 'نامعلوم',
  'battery.remainingTime': '{{hours}}گھ {{minutes}}م',
  'battery.remainingMinutes': '{{minutes}}م',
  'battery.error.noProvider':
    '`@molecule/app-battery`: کوئی فراہم کنندہ سیٹ نہیں ہے۔ ایک `BatteryProvider` نفاذ کے ساتھ `setProvider()` کو کال کریں — بیڑے کے ساتھ کوئی فراہم کنندہ جہاز نہیں بھیجتا ہے۔ انٹرفیس کو اپنے مقامی رن ٹائم پر لاگو کریں اور اسے بانڈ کریں۔',
}
