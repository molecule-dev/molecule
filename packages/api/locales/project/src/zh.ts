import type { ProjectTranslations } from './types.js'

/** Project translations for Chinese. */
export const zh: ProjectTranslations = {
  'project.error.nameAndTypeRequired': '需要 name 和 projectType',
  'project.error.notFound': '未找到',
  'project.error.forbidden': '拒绝访问',
  'project.error.createFailed': '创建项目失败',
  'project.error.invalidType':
    '不支持的项目类型；预期类型为：api、app、full-stack、static、status-page、status-page-edge 之一。',
  'project.error.deleteFailed': '删除项目失败',
  'project.error.listFailed': '项目列表创建失败',
  'project.error.readFailed': '项目读取失败',
  'project.error.updateFailed': '项目更新失败',
}
