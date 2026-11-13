import type { NetworkTranslations } from './types.js'

/** Network translations for zh. */
export const zh: Partial<NetworkTranslations> = {
  'network.none': '已断开',
  'network.unknown': '未知',
  'network.wifi': '无线上网',
  'network.cellular': '细胞',
  'network.ethernet': '以太网',
  'network.bluetooth': '蓝牙',
  'network.vpn': 'VPN',
  'network.other': '其他',
  'network.error.connectionTimeout': '网络连接超时',
  'network.error.unavailable': '网络不可用',
  'network.error.missingDependency':
    '`{{library}}`是必需的，但尚未安装。请使用以下命令安装：`npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`：未设置提供程序。请使用`NetworkProvider`实现（例如，来自`@molecule/app-network-react-native`）调用`setProvider()`。',
}
