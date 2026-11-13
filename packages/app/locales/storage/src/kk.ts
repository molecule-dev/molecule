import type { StorageTranslations } from './types.js'

/** Storage translations for Kazakh. */
export const kk: StorageTranslations = {
  'storage.error.noProvider':
    'Сақтау провайдері конфигурацияланбаған. Алдымен setProvider() шақырыңыз.',
  'storage.error.quotaExceeded': '"{{key}}" кілтін орнату кезінде сақтау квотасы асып кетті',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` орнатылмаған. Оны келесі жолмен орнатыңыз: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'AsyncStorage ішіндегі " {{key}} " кілті үшін мән орнату сәтсіз аяқталды',
}
