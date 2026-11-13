import type { BatteryTranslations } from './types.js'

/** Battery translations for hi. */
export const hi: Partial<BatteryTranslations> = {
  'battery.unknown': 'अज्ञात',
  'battery.remainingUnknown': 'अज्ञात',
  'battery.remainingMinutes': '{{minutes}}मि',
  'battery.charging': 'चार्ज',
  'battery.discharging': 'बैटरी पर',
  'battery.full': 'पूर्णतःउर्जित',
  'battery.not-charging': 'चार्ज नही हो रहा हैं',
  'battery.remainingTime': '{{hours}} एच {{minutes}} एम',
  'battery.error.noProvider':
    '`@molecule/app-battery`: कोई प्रदाता सेट नहीं है। `BatteryProvider` कार्यान्वयन के साथ `setProvider()` कॉल करें — फ्लीट के साथ कोई प्रदाता शामिल नहीं है; अपने नेटिव रनटाइम पर इंटरफ़ेस को लागू करें और इसे बॉन्ड करें।',
}
