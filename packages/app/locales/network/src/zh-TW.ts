import type { NetworkTranslations } from './types.js'

/** Network translations for Chinese (Traditional). */
export const zhTW: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': '行動數據',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': '其他',
  'network.none': '已中斷連線',
  'network.unknown': '未知',
  'network.error.connectionTimeout': '網路連線逾時',
  'network.error.unavailable': '網路不可用',
  'network.error.missingDependency':
    '`{{library}}`是必要的，但尚未安裝。請使用以下指令安裝：`npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`：未設定提供者。請使用`NetworkProvider`實作（例如，來自`@molecule/app-network-react-native`）呼叫`setProvider()`。',
}
