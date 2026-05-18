import type { NetworkTranslations } from './types.js'

/** Network translations for ja. */
export const ja: Partial<NetworkTranslations> = {
  'network.none': '切断済み',
  'network.unknown': '不明',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'セルラー',
  'network.ethernet': 'イーサネット',
  'network.bluetooth': 'ブルートゥース',
  'network.vpn': 'VPN',
  'network.other': '他の',
  'network.error.connectionTimeout': 'ネットワーク接続タイムアウト',
  'network.error.unavailable': 'ネットワークが利用できません',
}
