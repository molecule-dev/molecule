import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Serbian. */
export const sr: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Бројање верзија није успело',
  'versionHistory.error.createFailed': 'Креирање верзије није успело',
  'versionHistory.error.diffFailed': 'Поређење верзија није успело',
  'versionHistory.error.diffNotFound':
    'Једна или обе верзије нису пронађене или припадају различитим ресурсима',
  'versionHistory.error.invalidVersion': 'Број верзије мора бити позитиван цео број',
  'versionHistory.error.listFailed': 'Излиставање верзија није успело',
  'versionHistory.error.missingId': 'Потребан је ID верзије',
  'versionHistory.error.missingResource': 'Потребни су тип и ID ресурса',
  'versionHistory.error.notFound': 'Верзија није пронађена',
  'versionHistory.error.readFailed': 'Читање верзије није успело',
  'versionHistory.error.restoreFailed': 'Враћање верзије није успело',
  'versionHistory.error.validationFailed': 'Провера није успела',
}
