import type { NetworkTranslations } from './types.js'

/** Network translations for Sinhala. */
export const si: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'සෙලියුලර්',
  'network.ethernet': 'ඊතර්නෙට්',
  'network.bluetooth': 'බ්ලූටූත්',
  'network.vpn': 'VPN',
  'network.other': 'වෙනත්',
  'network.none': 'විසන්ධි විය',
  'network.unknown': 'නොදන්නා',
  'network.error.connectionTimeout': 'ජාල සම්බන්ධතා කාලය ඉක්මවා ඇත',
  'network.error.unavailable': 'ජාලය නොමැත',
  'network.error.missingDependency':
    '`{{library}}` අවශ්‍යයි නමුත් ස්ථාපනය කර නැත. `npm install {{library}}` සමඟ එය ස්ථාපනය කරන්න.',
  'network.error.noProvider':
    '`@molecule/app-network`: සැපයුම්කරුවෙකු සකසා නැත. `NetworkProvider` ක්‍රියාත්මක කිරීමක් සහිත `setProvider()` අමතන්න (උදා: `@molecule/app-network-react-native` වෙතින්).',
}
