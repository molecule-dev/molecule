import type { NetworkTranslations } from './types.js'

/** Network translations for Slovak. */
export const sk: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobilná sieť',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ostatné',
  'network.none': 'Odpojené',
  'network.unknown': 'Neznáme',
  'network.error.connectionTimeout': 'Vypršal časový limit sieťového pripojenia',
  'network.error.unavailable': 'Sieť nedostupná',
  'network.error.missingDependency':
    '`{{library}}` je povinný, ale nie je nainštalovaný. Nainštalujte ho pomocou: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Žiadny nastavený poskytovateľ. Zavolajte `setProvider()` s implementáciou `NetworkProvider` (napr. z `@molecule/app-network-react-native`).',
}
