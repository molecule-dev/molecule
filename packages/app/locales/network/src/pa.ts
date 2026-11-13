import type { NetworkTranslations } from './types.js'

/** Network translations for Punjabi. */
export const pa: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'ਸੈਲੂਲਰ',
  'network.ethernet': 'ਈਥਰਨੈੱਟ',
  'network.bluetooth': 'ਬਲੂਟੁੱਥ',
  'network.vpn': 'VPN',
  'network.other': 'ਹੋਰ',
  'network.none': 'ਡਿਸਕਨੈਕਟ',
  'network.unknown': 'ਅਣਜਾਣ',
  'network.error.connectionTimeout': 'ਨੈੱਟਵਰਕ ਕਨੈਕਸ਼ਨ ਟਾਈਮਆਊਟ',
  'network.error.unavailable': 'ਨੈੱਟਵਰਕ ਉਪਲਬਧ ਨਹੀਂ',
  'network.error.missingDependency':
    '`{{library}}` ਦੀ ਲੋੜ ਹੈ ਪਰ ਇੰਸਟਾਲ ਨਹੀਂ ਹੈ। ਇਸਨੂੰ ਇਸ ਨਾਲ ਇੰਸਟਾਲ ਕਰੋ: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: ਕੋਈ ਪ੍ਰਦਾਤਾ ਸੈੱਟ ਨਹੀਂ ਹੈ। `setProvider()` ਨੂੰ `NetworkProvider` ਲਾਗੂਕਰਨ ਨਾਲ ਕਾਲ ਕਰੋ (ਜਿਵੇਂ ਕਿ, `@molecule/app-network-react-native` ਤੋਂ)।',
}
