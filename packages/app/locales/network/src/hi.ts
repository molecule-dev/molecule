import type { NetworkTranslations } from './types.js'

/** Network translations for hi. */
export const hi: Partial<NetworkTranslations> = {
  'network.none': 'डिस्कनेक्ट किया गया',
  'network.unknown': 'अज्ञात',
  'network.wifi': 'वाईफ़ाई',
  'network.cellular': 'सेलुलर',
  'network.ethernet': 'ईथरनेट',
  'network.bluetooth': 'ब्लूटूथ',
  'network.vpn': 'वीपीएन',
  'network.other': 'अन्य',
  'network.error.connectionTimeout': 'नेटवर्क कनेक्शन टाइमआउट',
  'network.error.unavailable': 'नेटवर्क अनुपलब्ध है',
  'network.error.missingDependency':
    '`{{library}}` आवश्यक है लेकिन स्थापित नहीं है। इसे निम्न कमांड से स्थापित करें: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: कोई प्रदाता सेट नहीं है। `NetworkProvider` कार्यान्वयन (उदाहरण के लिए, `@molecule/app-network-react-native` से) के साथ `setProvider()` को कॉल करें।',
}
