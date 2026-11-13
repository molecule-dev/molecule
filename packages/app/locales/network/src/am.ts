import type { NetworkTranslations } from './types.js'

/** Network translations for Amharic. */
export const am: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'ሴሉላር',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'ሌላ',
  'network.none': 'ተቋርጧል',
  'network.unknown': 'ያልታወቀ',
  'network.error.connectionTimeout': 'የአውታረ መረብ ግንኙነት ጊዜ አልፏል',
  'network.error.unavailable': 'አውታረ መረብ አይገኝም',
  'network.error.missingDependency':
    '`{{library}}` ያስፈልጋል ግን አልተጫነም። በሚከተለው ይጫኑት፦ `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`፦ ምንም አቅራቢ አልተዘጋጀም። `setProvider()`ን በ`NetworkProvider` ትግበራ ይጥሩ (ለምሳሌ ከ`@molecule/app-network-react-native`)።',
}
