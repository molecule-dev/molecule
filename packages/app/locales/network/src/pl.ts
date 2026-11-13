import type { NetworkTranslations } from './types.js'

/** Network translations for pl. */
export const pl: Partial<NetworkTranslations> = {
  'network.none': 'Rozłączono',
  'network.unknown': 'Nieznany',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Komórkowy',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Inny',
  'network.error.connectionTimeout': 'Przekroczono limit czasu połączenia sieciowego',
  'network.error.unavailable': 'Sieć niedostępna',
  'network.error.missingDependency':
    '`{{library}}` jest wymagana, ale nie jest zainstalowana. Zainstaluj ją za pomocą: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Nie ustawiono dostawcy. Wywołaj `setProvider()` z implementacją `NetworkProvider` (np. z `@molecule/app-network-react-native`).',
}
