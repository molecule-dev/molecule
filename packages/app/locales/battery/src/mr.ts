import type { BatteryTranslations } from './types.js'

/** Battery translations for Marathi. */
export const mr: BatteryTranslations = {
  'battery.charging': 'चार्ज होत आहे',
  'battery.discharging': 'बॅटरीवर',
  'battery.full': 'पूर्ण चार्ज',
  'battery.not-charging': 'चार्ज होत नाही',
  'battery.unknown': 'अज्ञात',
  'battery.remainingUnknown': 'अज्ञात',
  'battery.remainingTime': '{{hours}}ता {{minutes}}मि',
  'battery.remainingMinutes': '{{minutes}}मि',
  'battery.error.noProvider':
    '`@molecule/app-battery`: कोणताही प्रोव्हायडर सेट केलेला नाही. `BatteryProvider` इम्प्लिमेंटेशनसह `setProvider()` कॉल करा — फ्लीटसोबत कोणताही प्रोव्हायडर येत नाही; तुमच्या नेटिव्ह रनटाइमवर इंटरफेस इम्प्लिमेंट करा आणि त्याला बाँड करा.',
}
