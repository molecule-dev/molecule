import type { NetworkTranslations } from './types.js'

/** Network translations for vi. */
export const vi: Partial<NetworkTranslations> = {
  'network.none': 'Đã ngắt kết nối',
  'network.unknown': 'Không xác định',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Tế bào',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Khác',
  'network.error.connectionTimeout': 'Hết thời gian chờ kết nối mạng',
  'network.error.unavailable': 'Mạng không khả dụng',
  'network.error.missingDependency':
    '`{{library}}` là thư viện cần thiết nhưng chưa được cài đặt. Hãy cài đặt nó bằng lệnh: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Chưa thiết lập nhà cung cấp. Hãy gọi `setProvider()` với một triển khai `NetworkProvider` (ví dụ: từ `@molecule/app-network-react-native`).',
}
