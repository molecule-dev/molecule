import type { StorageTranslations } from './types.js'

/** Storage translations for Dutch. */
export const nl: StorageTranslations = {
  'storage.error.noProvider': 'Opslagprovider niet geconfigureerd. Roep eerst setProvider() aan.',
  'storage.error.quotaExceeded':
    'Opslagquotum overschreden bij het instellen van sleutel "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` is niet geïnstalleerd. Installeer het met: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Het is niet gelukt om een waarde in te stellen voor de sleutel " {{key}} " in AsyncStorage.',
}
