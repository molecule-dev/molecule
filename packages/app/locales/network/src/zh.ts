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
}
