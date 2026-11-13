import type { NetworkTranslations } from './types.js'

/** Network translations for Telugu. */
export const te: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'సెల్యులార్',
  'network.ethernet': 'ఈథర్‌నెట్',
  'network.bluetooth': 'బ్లూటూత్',
  'network.vpn': 'VPN',
  'network.other': 'ఇతరం',
  'network.none': 'డిస్‌కనెక్ట్',
  'network.unknown': 'తెలియదు',
  'network.error.connectionTimeout': 'నెట్‌వర్క్ కనెక్షన్ సమయం ముగిసింది',
  'network.error.unavailable': 'నెట్‌వర్క్ అందుబాటులో లేదు',
  'network.error.missingDependency':
    '`{{library}}` అవసరం, కానీ ఇన్‌స్టాల్ చేయబడలేదు. దీనిని `npm install {{library}}` తో ఇన్‌స్టాల్ చేయండి.',
  'network.error.noProvider':
    '`@molecule/app-network`: ప్రొవైడర్ ఏదీ సెట్ చేయబడలేదు. `NetworkProvider` ఇంప్లిమెంటేషన్‌తో `setProvider()` కాల్ చేయండి (ఉదాహరణకు, `@molecule/app-network-react-native` నుండి).',
}
