import type { StorageTranslations } from './types.js'

/** Storage translations for Azerbaijani. */
export const az: StorageTranslations = {
  'storage.error.noProvider':
    'Saxlama provayderi konfiqurasiya olunmayıb. Əvvəlcə setProvider() çağırın.',
  'storage.error.quotaExceeded': '"{{key}}" açarını təyin edərkən saxlama kvotası aşıldı',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` quraşdırılmayıb. Bunu aşağıdakı əmrlə quraşdırın: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'AsyncStorage-da " {{key}} " açarı üçün dəyər təyin etmək uğursuz oldu',
}
