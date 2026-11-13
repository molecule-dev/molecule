import type { ProjectTranslations } from './types.js'

/** Project translations for Serbian. */
export const sr: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'name и projectType су обавезни',
  'project.error.notFound': 'Није пронађено',
  'project.error.forbidden': 'Приступ одбијен',
  'project.error.createFailed': 'Није успело креирање пројекта',
  'project.error.invalidType':
    'Неподржани тип пројекта; очекивана једна од: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Брисање пројекта није успело',
  'project.error.listFailed': 'Навођење пројеката није успело',
  'project.error.readFailed': 'Није успело читање пројекта',
  'project.error.updateFailed': 'Ажурирање пројекта није успело',
}
