import type { AiTranslations } from './types.js'

/** Ai translations for Ukrainian. */
export const uk: AiTranslations = {
  'ai.error.noProvider': "Постачальник ШІ не налаштований. Спочатку прив'яжіть постачальника ШІ.",
  'ai.error.apiError': 'Запит до API ШІ не вдався.',
  'ai.error.noResponseBody': 'Тіло відповіді ШІ порожнє.',
  'ai.error.ambiguousProvider':
    "Прив'язано кілька іменованих постачальників ШІ, а типовий не встановлено. Використайте getProviderByName(name), щоб вибрати одного.",
}
