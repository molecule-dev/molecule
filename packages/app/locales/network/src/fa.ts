import type { NetworkTranslations } from './types.js'

/** Network translations for Persian. */
export const fa: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'شبکه همراه',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'سایر',
  'network.none': 'قطع شده',
  'network.unknown': 'نامشخص',
  'network.error.connectionTimeout': 'مهلت اتصال شبکه به پایان رسید',
  'network.error.unavailable': 'شبکه در دسترس نیست',
  'network.error.missingDependency':
    '`{{library}}` مورد نیاز است اما نصب نشده است. آن را با دستور زیر نصب کنید: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: هیچ ارائه‌دهنده‌ای تنظیم نشده است. `setProvider()` را با پیاده‌سازی `NetworkProvider` فراخوانی کنید (مثلاً از `@molecule/app-network-react-native`).',
}
