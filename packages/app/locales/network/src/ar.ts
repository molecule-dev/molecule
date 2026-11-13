import type { NetworkTranslations } from './types.js'

/** Network translations for ar. */
export const ar: Partial<NetworkTranslations> = {
  'network.none': 'مفصول',
  'network.unknown': 'غير معروف',
  'network.wifi': 'واي فاي',
  'network.cellular': 'خلوي',
  'network.ethernet': 'إيثرنت',
  'network.bluetooth': 'بلوتوث',
  'network.vpn': 'VPN',
  'network.other': 'آخر',
  'network.error.connectionTimeout': 'انقطع الاتصال بالشبكة',
  'network.error.unavailable': 'الشبكة غير متاحة',
  'network.error.missingDependency':
    '`{{library}}` مطلوبة ولكنها غير مثبتة. قم بتثبيتها باستخدام الأمر التالي: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: لم يتم تعيين موفر. قم باستدعاء `setProvider()` مع تطبيق `NetworkProvider` (على سبيل المثال، من `@molecule/app-network-react-native`).',
}
