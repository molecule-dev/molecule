import type { NetworkTranslations } from './types.js'

/** Network translations for el. */
export const el: Partial<NetworkTranslations> = {
  'network.none': 'Αποσυνδεδεμένο',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Κυτταρικός',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Αλλος',
  'network.unknown': 'Αγνωστος',
  'network.error.connectionTimeout': 'Χρονικό όριο σύνδεσης δικτύου',
  'network.error.unavailable': 'Μη διαθέσιμο δίκτυο',
  'network.error.missingDependency':
    '`{{library}}` απαιτείται αλλά δεν είναι εγκατεστημένο. Εγκαταστήστε το με: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Δεν έχει οριστεί πάροχος. Καλέστε `setProvider()` με μια υλοποίηση `NetworkProvider` (π.χ., από το `@molecule/app-network-react-native`).',
}
