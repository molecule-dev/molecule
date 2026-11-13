import type { NetworkTranslations } from './types.js'

/** Network translations for Nepali. */
export const ne: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'सेलुलर',
  'network.ethernet': 'इथरनेट',
  'network.bluetooth': 'ब्लुटुथ',
  'network.vpn': 'VPN',
  'network.other': 'अन्य',
  'network.none': 'विच्छेद',
  'network.unknown': 'अज्ञात',
  'network.error.connectionTimeout': 'नेटवर्क जडान समय समाप्त',
  'network.error.unavailable': 'नेटवर्क अनुपलब्ध',
  'network.error.missingDependency':
    '`{{library}}` आवश्यक छ तर स्थापना गरिएको छैन। यसलाई `npm install {{library}}` सँग स्थापना गर्नुहोस्।',
  'network.error.noProvider':
    '`@molecule/app-network`: कुनै प्रदायक सेट गरिएको छैन। `NetworkProvider` कार्यान्वयनको साथ `setProvider()` लाई कल गर्नुहोस् (जस्तै, `@molecule/app-network-react-native` बाट)।',
}
