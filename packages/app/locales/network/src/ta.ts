import type { NetworkTranslations } from './types.js'

/** Network translations for Tamil. */
export const ta: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'செல்லுலார்',
  'network.ethernet': 'ஈதர்நெட்',
  'network.bluetooth': 'புளூடூத்',
  'network.vpn': 'VPN',
  'network.other': 'மற்றவை',
  'network.none': 'துண்டிக்கப்பட்டது',
  'network.unknown': 'தெரியாது',
  'network.error.connectionTimeout': 'நெட்வொர்க் இணைப்பு நேரம் முடிந்தது',
  'network.error.unavailable': 'நெட்வொர்க் கிடைக்கவில்லை',
  'network.error.missingDependency':
    '`{{library}}` தேவைப்படுகிறது, ஆனால் நிறுவப்படவில்லை. இதை `npm install {{library}}` மூலம் நிறுவவும்.',
  'network.error.noProvider':
    '`@molecule/app-network`: வழங்குநர் எதுவும் அமைக்கப்படவில்லை. `setProvider()` செயல்பாட்டை ஒரு `NetworkProvider` செயலாக்கத்துடன் அழைக்கவும் (எ.கா., `@molecule/app-network-react-native` இலிருந்து).',
}
