import type { NetworkTranslations } from './types.js'

/** Network translations for Bengali. */
export const bn: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'সেলুলার',
  'network.ethernet': 'ইথারনেট',
  'network.bluetooth': 'ব্লুটুথ',
  'network.vpn': 'VPN',
  'network.other': 'অন্যান্য',
  'network.none': 'সংযোগ বিচ্ছিন্ন',
  'network.unknown': 'অজানা',
  'network.error.connectionTimeout': 'নেটওয়ার্ক সংযোগ সময়সীমা অতিক্রান্ত',
  'network.error.unavailable': 'নেটওয়ার্ক অনুপলব্ধ',
  'network.error.missingDependency':
    '`{{library}}` প্রয়োজন কিন্তু এটি ইনস্টল করা নেই। এটি ইনস্টল করুন: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: কোনো প্রোভাইডার সেট করা নেই। একটি `NetworkProvider` ইমপ্লিমেন্টেশন (যেমন, `@molecule/app-network-react-native` থেকে) দিয়ে `setProvider()` কল করুন।',
}
