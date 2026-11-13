import type { ProjectTranslations } from './types.js'

/** Project translations for Chinese (Traditional). */
export const zhTW: ProjectTranslations = {
  'project.error.nameAndTypeRequired': '需要 name 和 projectType',
  'project.error.notFound': '找不到',
  'project.error.forbidden': '拒絕訪問',
  'project.error.createFailed': '建立專案失敗',
  'project.error.invalidType':
    '不支援的項目類型；預期類型為：api、app、full-stack、static、status-page、status-page-edge 之一。',
  'project.error.deleteFailed': '刪除項目失敗',
  'project.error.listFailed': '專案清單建立失敗',
  'project.error.readFailed': '專案讀取失敗',
  'project.error.updateFailed': '專案更新失敗',
}
