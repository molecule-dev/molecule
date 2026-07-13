import type { AiTranslations } from './types.js'

/** Ai translations for Bulgarian. */
export const bg: AiTranslations = {
  'ai.error.noProvider': 'AI доставчикът не е конфигуриран. Първо свържете AI доставчик.',
  'ai.error.apiError': 'AI API заявката е неуспешна.',
  'ai.error.noResponseBody': 'Тялото на AI отговора е празно.',
  'ai.error.ambiguousProvider':
    'Свързани са няколко именувани AI доставчици и не е зададен доставчик по подразбиране. Използвайте getProviderByName(name), за да изберете един.',
}
