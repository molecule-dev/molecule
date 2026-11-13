import type { NetworkTranslations } from './types.js'

/** Network translations for sv. */
export const sv: Partial<NetworkTranslations> = {
  'network.none': 'Frånkopplad',
  'network.unknown': 'Okänd',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobil',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Andra',
  'network.error.connectionTimeout': 'Timeout för nätverksanslutning',
  'network.error.unavailable': 'Nätverket är inte tillgängligt',
  'network.error.missingDependency':
    '`{{library}}` krävs men är inte installerat. Installera det med: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Ingen provider angiven. Anropa `setProvider()` med en `NetworkProvider` -implementering (t.ex. från `@molecule/app-network-react-native`).',
}
