import type { NetworkTranslations } from './types.js'

/** Network translations for Khmer. */
export const km: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'បណ្តាញចល័ត',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'ផ្សេងទៀត',
  'network.none': 'ផ្តាច់ការតភ្ជាប់',
  'network.unknown': 'មិនស្គាល់',
  'network.error.connectionTimeout': 'អស់ពេលភ្ជាប់បណ្តាញ',
  'network.error.unavailable': 'បណ្តាញមិនអាចប្រើបាន',
  'network.error.missingDependency':
    'តម្រូវឲ្យមាន `{{library}}` ប៉ុន្តែមិនទាន់បានដំឡើងនៅឡើយទេ។ ដំឡើងវាជាមួយ៖ `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: គ្មានអ្នកផ្តល់សេវាណាមួយត្រូវបានកំណត់ទេ។ ហៅ `setProvider()` ជាមួយនឹងការអនុវត្ត `NetworkProvider` (ឧ. ពី `@molecule/app-network-react-native`)។',
}
