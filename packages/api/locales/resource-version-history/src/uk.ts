import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Ukrainian. */
export const uk: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Не вдалося підрахувати версії',
  'versionHistory.error.createFailed': 'Не вдалося створити версію',
  'versionHistory.error.diffFailed': 'Не вдалося порівняти версії',
  'versionHistory.error.diffNotFound':
    'Одну або обидві версії не знайдено, або вони належать до різних ресурсів',
  'versionHistory.error.invalidVersion': 'Номер версії має бути додатним цілим числом',
  'versionHistory.error.listFailed': 'Не вдалося отримати список версій',
  'versionHistory.error.missingId': 'Потрібен ідентифікатор версії',
  'versionHistory.error.missingResource': 'Потрібні тип і ідентифікатор ресурсу',
  'versionHistory.error.notFound': 'Версію не знайдено',
  'versionHistory.error.readFailed': 'Не вдалося прочитати версію',
  'versionHistory.error.restoreFailed': 'Не вдалося відновити версію',
  'versionHistory.error.validationFailed': 'Перевірку не пройдено',
}
