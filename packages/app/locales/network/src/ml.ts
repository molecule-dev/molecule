import type { NetworkTranslations } from './types.js'

/** Network translations for Malayalam. */
export const ml: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'സെല്ലുലാർ',
  'network.ethernet': 'ഈഥർനെറ്റ്',
  'network.bluetooth': 'ബ്ലൂടൂത്ത്',
  'network.vpn': 'VPN',
  'network.other': 'മറ്റുള്ളവ',
  'network.none': 'വിച്ഛേദിച്ചു',
  'network.unknown': 'അജ്ഞാതം',
  'network.error.connectionTimeout': 'നെറ്റ്‌വർക്ക് കണക്ഷൻ സമയപരിധി കഴിഞ്ഞു',
  'network.error.unavailable': 'നെറ്റ്‌വർക്ക് ലഭ്യമല്ല',
  'network.error.missingDependency':
    '`{{library}}` ആവശ്യമാണ്, പക്ഷേ ഇൻസ്റ്റാൾ ചെയ്തിട്ടില്ല. `npm install {{library}}` ഉപയോഗിച്ച് ഇത് ഇൻസ്റ്റാൾ ചെയ്യുക.',
  'network.error.noProvider':
    '`@molecule/app-network`: ദാതാവിനെ സജ്ജീകരിച്ചിട്ടില്ല. `NetworkProvider` നടപ്പിലാക്കൽ ഉപയോഗിച്ച് `setProvider()` വിളിക്കുക (ഉദാഹരണത്തിന്, `@molecule/app-network-react-native` എന്നതിൽ നിന്ന്).',
}
