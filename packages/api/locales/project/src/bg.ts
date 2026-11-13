import type { ProjectTranslations } from './types.js'

/** Project translations for Bulgarian. */
export const bg: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'name и projectType са задължителни',
  'project.error.notFound': 'Не е намерено',
  'project.error.forbidden': 'Достъпът е отказан',
  'project.error.createFailed': 'Създаването на проект не бе успешно',
  'project.error.invalidType':
    'Неподдържан тип проект; очаква се един от: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Изтриването на проекта не бе успешно',
  'project.error.listFailed': 'Изброяването на проекти не бе успешно',
  'project.error.readFailed': 'Неуспешно четене на проекта',
  'project.error.updateFailed': 'Актуализирането на проекта не бе успешно',
}
