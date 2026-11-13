import type { StorageTranslations } from './types.js'

/** Storage translations for Icelandic. */
export const is: StorageTranslations = {
  'storage.error.noProvider':
    'Geymsluveita er ekki stillt. Kalla\u00F0u \u00E1 setProvider() fyrst.',
  'storage.error.quotaExceeded': 'Geymslukvóta farin yfir vi\u00F0 uppsetningu lykils "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` er ekki uppsett. Setjið það upp með: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Mistókst að stilla gildi fyrir lykilinn " {{key}} " í AsyncStorage',
}
