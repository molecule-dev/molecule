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
  'network.error.missingDependency':
    '`{{library}}` が必要ですが、インストールされていません。`npm install {{library}}` でインストールしてください。',
  'network.error.noProvider':
    '`@molecule/app-network`: プロバイダーが設定されていません。`NetworkProvider` の実装（例: `@molecule/app-network-react-native` のもの）を渡して `setProvider()` を呼び出してください。',
}
