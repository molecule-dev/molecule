import type { TrashTranslations } from './types.js'

/** Trash translations for Bulgarian. */
export const bg: TrashTranslations = {
  'trash.error.alreadyResolved': 'Изтритият елемент вече е възстановен или премахнат окончателно',
  'trash.error.countFailed': 'Преброяването на изтритите елементи е неуспешно',
  'trash.error.listFailed': 'Извеждането на изтритите елементи е неуспешно',
  'trash.error.missingId': 'Изисква се идентификатор на кошчето',
  'trash.error.missingResource': 'Изискват се тип и идентификатор на ресурса',
  'trash.error.notFound': 'Изтритият елемент не е намерен',
  'trash.error.noRestoreHandler':
    'За този тип ресурс не е регистриран манипулатор за възстановяване',
  'trash.error.purgeFailed': 'Окончателното премахване на изтрития елемент е неуспешно',
  'trash.error.readFailed': 'Четенето на изтрития елемент е неуспешно',
  'trash.error.restoreFailed': 'Възстановяването на изтрития елемент е неуспешно',
  'trash.error.trashFailed': 'Преместването на елемента в кошчето е неуспешно',
  'trash.error.validationFailed': 'Проверката е неуспешна',
}
