import type { DatabaseTranslations } from './types.js'

/** Database translations for Japanese. */
export const ja: DatabaseTranslations = {
  'database.error.noProvider':
    'データベースプールが設定されていません。先にsetPool()を呼び出してください。',
  'database.error.storeNotConfigured':
    'DataStoreが設定されていません。先にsetStore()を呼び出してください。',
}
