import type { NetworkTranslations } from './types.js'

/** Network translations for Marathi. */
export const mr: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'सेल्युलर',
  'network.ethernet': 'इथरनेट',
  'network.bluetooth': 'ब्लूटूथ',
  'network.vpn': 'VPN',
  'network.other': 'इतर',
  'network.none': 'डिस्कनेक्ट',
  'network.unknown': 'अज्ञात',
  'network.error.connectionTimeout': 'नेटवर्क कनेक्शन टाइमआउट',
  'network.error.unavailable': 'नेटवर्क अनुपलब्ध',
  'network.error.missingDependency':
    '`{{library}}` आवश्यक आहे, परंतु स्थापित केलेले नाही. `npm install {{library}}` वापरून ते स्थापित करा.',
  'network.error.noProvider':
    '`@molecule/app-network`: कोणताही प्रोव्हायडर सेट केलेला नाही. `NetworkProvider` इम्प्लिमेंटेशनसह `setProvider()` कॉल करा (उदा., `@molecule/app-network-react-native` मधून).',
}
