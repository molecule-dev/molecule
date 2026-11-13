import type { NetworkTranslations } from './types.js'

/** Network translations for Gujarati. */
export const gu: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'સેલ્યુલર',
  'network.ethernet': 'ઈથરનેટ',
  'network.bluetooth': 'બ્લૂટૂથ',
  'network.vpn': 'VPN',
  'network.other': 'અન્ય',
  'network.none': 'ડિસ્કનેક્ટેડ',
  'network.unknown': 'અજ્ઞાત',
  'network.error.connectionTimeout': 'નેટવર્ક કનેક્શન ટાઇમઆઉટ',
  'network.error.unavailable': 'નેટવર્ક ઉપલબ્ધ નથી',
  'network.error.missingDependency':
    '`{{library}}` જરૂરી છે પણ ઇન્સ્ટોલ કરેલું નથી. તેને આની સાથે ઇન્સ્ટોલ કરો: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: કોઈ પ્રદાતા સેટ નથી. `NetworkProvider` અમલીકરણ સાથે `setProvider()` કૉલ કરો (દા.ત., `@molecule/app-network-react-native` માંથી).',
}
