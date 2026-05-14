import type { TrashTranslations } from './types.js'

/** Trash translations for Chinese. */
export const zh: TrashTranslations = {
  'trash.error.alreadyResolved': '回收站项目已被还原或永久删除',
  'trash.error.countFailed': '无法统计回收站项目数量',
  'trash.error.listFailed': '无法列出回收站项目',
  'trash.error.missingId': '需要回收站 ID',
  'trash.error.missingResource': '需要资源类型和 ID',
  'trash.error.notFound': '未找到回收站项目',
  'trash.error.noRestoreHandler': '未为此资源类型注册还原处理程序',
  'trash.error.purgeFailed': '无法永久删除回收站项目',
  'trash.error.readFailed': '无法读取回收站项目',
  'trash.error.restoreFailed': '无法还原回收站项目',
  'trash.error.trashFailed': '无法将项目移至回收站',
  'trash.error.validationFailed': '验证失败',
}
