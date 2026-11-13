import type { NetworkTranslations } from './types.js'

/** Network translations for Urdu. */
export const ur: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'سیلولر',
  'network.ethernet': 'ایتھرنیٹ',
  'network.bluetooth': 'بلوٹوتھ',
  'network.vpn': 'VPN',
  'network.other': 'دیگر',
  'network.none': 'منقطع',
  'network.unknown': 'نامعلوم',
  'network.error.connectionTimeout': 'نیٹ ورک کنکشن کا وقت ختم',
  'network.error.unavailable': 'نیٹ ورک دستیاب نہیں',
  'network.error.missingDependency':
    '`{{library}}` درکار ہے لیکن انسٹال نہیں ہے۔ اسے اس کے ساتھ انسٹال کریں: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: کوئی فراہم کنندہ سیٹ نہیں ہے۔ ایک `NetworkProvider` نفاذ کے ساتھ `setProvider()` کال کریں (جیسے، `@molecule/app-network-react-native` سے)۔',
}
