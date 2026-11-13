import type { NetworkTranslations } from './types.js'

/** Network translations for Hebrew. */
export const he: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'סלולרי',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'אחר',
  'network.none': 'מנותק',
  'network.unknown': 'לא ידוע',
  'network.error.connectionTimeout': 'זמן החיבור לרשת פג',
  'network.error.unavailable': 'הרשת אינה זמינה',
  'network.error.missingDependency':
    '`{{library}}` נדרש אך אינו מותקן. התקן אותו באמצעות: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: לא הוגדר ספק. קריאה ל `setProvider()` עם מימוש של `NetworkProvider` (לדוגמה, מ- `@molecule/app-network-react-native`).',
}
