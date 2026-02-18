import type { DatabaseTranslations } from './types.js'

/** Database translations for Korean. */
export const ko: DatabaseTranslations = {
  'database.error.noProvider':
    '데이터베이스 풀이 구성되지 않았습니다. 먼저 setPool()을 호출하세요.',
  'database.error.storeNotConfigured':
    'DataStore가 구성되지 않았습니다. 먼저 setStore()를 호출하세요.',
}
