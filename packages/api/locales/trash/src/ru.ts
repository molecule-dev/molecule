import type { TrashTranslations } from './types.js'

/** Trash translations for Russian. */
export const ru: TrashTranslations = {
  'trash.error.alreadyResolved': 'Удалённый элемент уже восстановлен или удалён безвозвратно',
  'trash.error.countFailed': 'Не удалось подсчитать удалённые элементы',
  'trash.error.listFailed': 'Не удалось получить список удалённых элементов',
  'trash.error.missingId': 'Требуется идентификатор корзины',
  'trash.error.missingResource': 'Требуются тип и идентификатор ресурса',
  'trash.error.notFound': 'Удалённый элемент не найден',
  'trash.error.noRestoreHandler':
    'Для этого типа ресурса не зарегистрирован обработчик восстановления',
  'trash.error.purgeFailed': 'Не удалось безвозвратно удалить удалённый элемент',
  'trash.error.readFailed': 'Не удалось прочитать удалённый элемент',
  'trash.error.restoreFailed': 'Не удалось восстановить удалённый элемент',
  'trash.error.trashFailed': 'Не удалось переместить элемент в корзину',
  'trash.error.validationFailed': 'Проверка не пройдена',
}
