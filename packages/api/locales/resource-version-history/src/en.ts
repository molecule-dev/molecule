import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for English. */
export const en: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Failed to count versions',
  'versionHistory.error.createFailed': 'Failed to create version',
  'versionHistory.error.diffFailed': 'Failed to diff versions',
  'versionHistory.error.diffNotFound':
    'One or both versions not found, or they belong to different resources',
  'versionHistory.error.invalidVersion': 'Version number must be a positive integer',
  'versionHistory.error.listFailed': 'Failed to list versions',
  'versionHistory.error.missingId': 'Version ID is required',
  'versionHistory.error.missingResource': 'Resource type and ID are required',
  'versionHistory.error.notFound': 'Version not found',
  'versionHistory.error.readFailed': 'Failed to read version',
  'versionHistory.error.restoreFailed': 'Failed to restore version',
  'versionHistory.error.validationFailed': 'Validation failed',
}
