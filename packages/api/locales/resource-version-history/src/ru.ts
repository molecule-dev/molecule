import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Russian. */
export const ru: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Не удалось подсчитать версии',
  'versionHistory.error.createFailed': 'Не удалось создать версию',
  'versionHistory.error.diffFailed': 'Не удалось сравнить версии',
  'versionHistory.error.diffNotFound':
    'Одна или обе версии не найдены либо принадлежат разным ресурсам',
  'versionHistory.error.invalidVersion': 'Номер версии должен быть положительным целым числом',
  'versionHistory.error.listFailed': 'Не удалось получить список версий',
  'versionHistory.error.missingId': 'Требуется идентификатор версии',
  'versionHistory.error.missingResource': 'Требуются тип и идентификатор ресурса',
  'versionHistory.error.notFound': 'Версия не найдена',
  'versionHistory.error.readFailed': 'Не удалось прочитать версию',
  'versionHistory.error.restoreFailed': 'Не удалось восстановить версию',
  'versionHistory.error.validationFailed': 'Проверка не пройдена',
}
