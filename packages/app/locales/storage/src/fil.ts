import type { StorageTranslations } from './types.js'

/** Storage translations for Filipino. */
export const fil: StorageTranslations = {
  'storage.error.noProvider':
    'Hindi na-configure ang storage provider. Tawagan muna ang setProvider().',
  'storage.error.quotaExceeded':
    'Lumampas na sa storage quota kapag itinatakda ang key na "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    'Hindi naka-install ang `@react-native-async-storage/async-storage` . I-install ito gamit ang: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Nabigong itakda ang halaga para sa key na " {{key}} " sa AsyncStorage',
}
