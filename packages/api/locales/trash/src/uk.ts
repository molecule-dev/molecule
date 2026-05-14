import type { TrashTranslations } from './types.js'

/** Trash translations for Ukrainian. */
export const uk: TrashTranslations = {
  'trash.error.alreadyResolved': 'Видалений елемент уже відновлено або остаточно вилучено',
  'trash.error.countFailed': 'Не вдалося підрахувати видалені елементи',
  'trash.error.listFailed': 'Не вдалося отримати список видалених елементів',
  'trash.error.missingId': 'Потрібен ідентифікатор кошика',
  'trash.error.missingResource': 'Потрібні тип і ідентифікатор ресурсу',
  'trash.error.notFound': 'Видалений елемент не знайдено',
  'trash.error.noRestoreHandler': 'Для цього типу ресурсу не зареєстровано обробник відновлення',
  'trash.error.purgeFailed': 'Не вдалося остаточно вилучити видалений елемент',
  'trash.error.readFailed': 'Не вдалося прочитати видалений елемент',
  'trash.error.restoreFailed': 'Не вдалося відновити видалений елемент',
  'trash.error.trashFailed': 'Не вдалося перемістити елемент у кошик',
  'trash.error.validationFailed': 'Перевірку не пройдено',
}
