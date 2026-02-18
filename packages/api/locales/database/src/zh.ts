import type { DatabaseTranslations } from './types.js'

/** Database translations for Chinese. */
export const zh: DatabaseTranslations = {
  'database.error.noProvider': '数据库连接池未配置。请先调用 setPool()。',
  'database.error.storeNotConfigured': 'DataStore 未配置。请先调用 setStore()。',
}
