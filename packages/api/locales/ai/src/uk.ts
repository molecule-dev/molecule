import type { AiTranslations } from './types.js'

/** Ai translations for Ukrainian. */
export const uk: AiTranslations = {
  'ai.error.noProvider': "Постачальник ШІ не налаштований. Спочатку прив'яжіть постачальника ШІ.",
  'ai.error.ambiguousProvider':
    "Прив'язано кілька іменованих постачальників ШІ, а типовий не встановлено. Використайте getProviderByName(name), щоб вибрати одного.",
  'ai.error.responseIncomplete':
    'Відповідь ШІ завершилася до завершення. Будь ласка, спробуйте ще раз.',
  'ai.error.responseTokenLimit': 'Відповідь ШІ досягла ліміту вихідних токенів до завершення.',
  'ai.error.apiError': 'Помилка служби штучного інтелекту. Спробуйте ще раз.',
  'ai.error.noResponseBody': 'Жодної відповіді від служби штучного інтелекту.',
}
