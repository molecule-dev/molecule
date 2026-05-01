import type { TrashTranslations } from './types.js'

/** Trash translations for English. */
export const en: TrashTranslations = {
  'trash.error.alreadyResolved': 'Trashed item has already been restored or purged',
  'trash.error.countFailed': 'Failed to count trashed items',
  'trash.error.listFailed': 'Failed to list trashed items',
  'trash.error.missingId': 'Trash ID is required',
  'trash.error.missingResource': 'Resource type and ID are required',
  'trash.error.notFound': 'Trashed item not found',
  'trash.error.noRestoreHandler': 'No restore handler is registered for this resource type',
  'trash.error.purgeFailed': 'Failed to purge trashed item',
  'trash.error.readFailed': 'Failed to read trashed item',
  'trash.error.restoreFailed': 'Failed to restore trashed item',
  'trash.error.trashFailed': 'Failed to trash item',
  'trash.error.validationFailed': 'Validation failed',
}
