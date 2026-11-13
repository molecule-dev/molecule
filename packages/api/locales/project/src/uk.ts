import type { ProjectTranslations } from './types.js'

/** Project translations for Ukrainian. */
export const uk: ProjectTranslations = {
  'project.error.nameAndTypeRequired': "name та projectType є обов'язковими",
  'project.error.notFound': 'Не знайдено',
  'project.error.forbidden': 'Доступ заборонено',
  'project.error.createFailed': 'Не вдалося створити проєкт',
  'project.error.invalidType':
    'Непідтримуваний тип проекту; очікується один із таких значень: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Не вдалося видалити проєкт',
  'project.error.listFailed': 'Не вдалося перерахувати проекти',
  'project.error.readFailed': 'Не вдалося прочитати проєкт',
  'project.error.updateFailed': 'Не вдалося оновити проєкт',
}
