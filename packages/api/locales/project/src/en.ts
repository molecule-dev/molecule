import type { ProjectTranslations } from './types.js'

/** Project translations for English. */
export const en: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'name and projectType are required',
  'project.error.notFound': 'Not found',
  'project.error.forbidden': 'Access denied',
  'project.error.createFailed': 'Failed to create project',
  'project.error.invalidType':
    'Unsupported projectType; expected one of: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Failed to delete project',
  'project.error.listFailed': 'Failed to list projects',
  'project.error.readFailed': 'Failed to read project',
  'project.error.updateFailed': 'Failed to update project',
}
