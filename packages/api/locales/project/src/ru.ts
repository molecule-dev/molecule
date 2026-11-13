import type { ProjectTranslations } from './types.js'

/** Project translations for Russian. */
export const ru: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'name и projectType обязательны',
  'project.error.notFound': 'Не найдено',
  'project.error.forbidden': 'Доступ запрещен',
  'project.error.createFailed': 'Не удалось создать проект',
  'project.error.invalidType':
    'Неподдерживаемый projectType; ожидается один из следующих типов: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Проект не удалось удалить',
  'project.error.listFailed': 'Не удалось составить список проектов',
  'project.error.readFailed': 'Не смог прочитать проект',
  'project.error.updateFailed': 'Не удалось обновить проект',
}
