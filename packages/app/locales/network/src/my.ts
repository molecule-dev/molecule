import type { NetworkTranslations } from './types.js'

/** Network translations for Burmese. */
export const my: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'ဆယ်လူလာ',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'အခြား',
  'network.none': 'ချိတ်ဆက်မှု ပြတ်တောက်သည်',
  'network.unknown': 'မသိ',
  'network.error.connectionTimeout': 'ကွန်ရက်ချိတ်ဆက်မှု အချိန်ကုန်သွားသည်',
  'network.error.unavailable': 'ကွန်ရက် မရရှိနိုင်ပါ',
  'network.error.missingDependency':
    '`{{library}}` လိုအပ်သော်လည်း ထည့်သွင်းထားခြင်း မရှိပါ။ အောက်ပါဖြင့် ထည့်သွင်းပါ- `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: ပံ့ပိုးပေးသူ သတ်မှတ်မထားပါ။ `NetworkProvider` အကောင်အထည်ဖော်မှုဖြင့် `setProvider()` ကို ခေါ်ဆိုပါ (ဥပမာ၊ `@molecule/app-network-react-native` မှ)။',
}
