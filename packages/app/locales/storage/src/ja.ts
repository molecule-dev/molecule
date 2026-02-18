import type { StorageTranslations } from './types.js'

/** Storage translations for Japanese. */
export const ja: StorageTranslations = {
  'storage.error.noProvider':
    'ストレージプロバイダーが設定されていません。先に setProvider() を呼び出してください。',
  'storage.error.quotaExceeded': 'キー "{{key}}" の設定時にストレージ容量制限を超えました',
}
