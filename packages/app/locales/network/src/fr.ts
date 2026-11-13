import type { NetworkTranslations } from './types.js'

/** Network translations for fr. */
export const fr: Partial<NetworkTranslations> = {
  'network.none': 'Déconnecté',
  'network.unknown': 'Inconnu',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Cellulaire',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Autre',
  'network.error.connectionTimeout': "Délai d'attente de la connexion réseau",
  'network.error.unavailable': 'Réseau indisponible',
  'network.error.missingDependency':
    "`{{library}}` est requise mais n'est pas installée. Installez-la avec : `npm install {{library}}`",
  'network.error.noProvider':
    '`@molecule/app-network`: Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation `NetworkProvider` (par exemple, depuis `@molecule/app-network-react-native`).',
}
