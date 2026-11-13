import type { StorageTranslations } from './types.js'

/** Storage translations for Turkish. */
export const tr: StorageTranslations = {
  'storage.error.noProvider': 'Depolama sağlayıcısı yapılandırılmamış. Önce setProvider() çağırın.',
  'storage.error.quotaExceeded': '"{{key}}" anahtarı ayarlanırken depolama kotası aşıldı',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` yüklü değil. Şu komutla yükleyin: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'AsyncStorage\'da " {{key}} " anahtarı için değer ayarlama başarısız oldu.',
}
