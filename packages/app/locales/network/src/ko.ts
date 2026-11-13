import type { NetworkTranslations } from './types.js'

/** Network translations for ko. */
export const ko: Partial<NetworkTranslations> = {
  'network.none': '연결 해제됨',
  'network.unknown': '알 수 없음',
  'network.wifi': '와이파이',
  'network.cellular': '세포',
  'network.ethernet': '이더넷',
  'network.bluetooth': '블루투스',
  'network.vpn': 'VPN',
  'network.other': '다른',
  'network.error.connectionTimeout': '네트워크 연결 시간 초과',
  'network.error.unavailable': '네트워크에 접속할 수 없습니다.',
  'network.error.missingDependency':
    '`{{library}}` 필요하지만 설치되어 있지 않습니다. 다음 명령으로 설치하세요: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: 공급자가 설정되지 않았습니다. `@molecule/app-network-react-native` 의 `NetworkProvider` 구현체를 사용하여 `setProvider()` 호출하십시오.',
}
