import type { NetworkTranslations } from './types.js'

/** Network translations for cs. */
export const cs: Partial<NetworkTranslations> = {
  'network.none': 'Odpojeno',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobilní',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ostatní',
  'network.unknown': 'Neznámý',
  'network.error.connectionTimeout': 'Časový limit síťového připojení',
  'network.error.unavailable': 'Síť není k dispozici',
  'network.error.missingDependency':
    '`{{library}}` je povinná, ale není nainstalovaná. Nainstalujte ji pomocí: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `NetworkProvider` (např. z `@molecule/app-network-react-native`).',
}
