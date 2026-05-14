import type { TrashTranslations } from './types.js'

/** Trash translations for Serbian. */
export const sr: TrashTranslations = {
  'trash.error.alreadyResolved': 'Избрисана ставка је већ враћена или трајно уклоњена',
  'trash.error.countFailed': 'Бројање избрисаних ставки није успело',
  'trash.error.listFailed': 'Излиставање избрисаних ставки није успело',
  'trash.error.missingId': 'Потребан је ID корпе',
  'trash.error.missingResource': 'Потребни су тип и ID ресурса',
  'trash.error.notFound': 'Избрисана ставка није пронађена',
  'trash.error.noRestoreHandler': 'За овај тип ресурса није регистрован руковалац за враћање',
  'trash.error.purgeFailed': 'Трајно уклањање избрисане ставке није успело',
  'trash.error.readFailed': 'Читање избрисане ставке није успело',
  'trash.error.restoreFailed': 'Враћање избрисане ставке није успело',
  'trash.error.trashFailed': 'Премештање ставке у корпу није успело',
  'trash.error.validationFailed': 'Провера није успела',
}
