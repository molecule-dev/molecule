import type { NetworkTranslations } from './types.js'

/** Network translations for Kannada. */
export const kn: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'ಸೆಲ್ಯುಲರ್',
  'network.ethernet': 'ಈಥರ್‌ನೆಟ್',
  'network.bluetooth': 'ಬ್ಲೂಟೂತ್',
  'network.vpn': 'VPN',
  'network.other': 'ಇತರೆ',
  'network.none': 'ಸಂಪರ್ಕ ಕಡಿತ',
  'network.unknown': 'ಅಜ್ಞಾತ',
  'network.error.connectionTimeout': 'ನೆಟ್‌ವರ್ಕ್ ಸಂಪರ್ಕ ಸಮಯ ಮೀರಿದೆ',
  'network.error.unavailable': 'ನೆಟ್‌ವರ್ಕ್ ಲಭ್ಯವಿಲ್ಲ',
  'network.error.missingDependency':
    '`{{library}}` ಅಗತ್ಯವಿದೆ ಆದರೆ ಸ್ಥಾಪಿಸಲಾಗಿಲ್ಲ. ಇದನ್ನು ಇದರೊಂದಿಗೆ ಸ್ಥಾಪಿಸಿ: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: ಯಾವುದೇ ಪೂರೈಕೆದಾರರನ್ನು ಹೊಂದಿಸಲಾಗಿಲ್ಲ. `NetworkProvider` ಅನುಷ್ಠಾನದೊಂದಿಗೆ `setProvider()` ಗೆ ಕರೆ ಮಾಡಿ (ಉದಾ, `@molecule/app-network-react-native` ನಿಂದ).',
}
