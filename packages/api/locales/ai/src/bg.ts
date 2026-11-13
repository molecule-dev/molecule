import type { AiTranslations } from './types.js'

/** Ai translations for Bulgarian. */
export const bg: AiTranslations = {
  'ai.error.noProvider': 'AI доставчикът не е конфигуриран. Първо свържете AI доставчик.',
  'ai.error.ambiguousProvider':
    'Свързани са няколко именувани AI доставчици и не е зададен доставчик по подразбиране. Използвайте getProviderByName(name), за да изберете един.',
  'ai.error.responseIncomplete':
    'Отговорът на изкуствения интелект приключи преди завършване. Моля, опитайте отново.',
  'ai.error.responseTokenLimit':
    'Отговорът на ИИ достигна лимита на изходните токени преди завършване.',
  'ai.error.apiError': 'Грешка в услугата за изкуствен интелект. Моля, опитайте отново.',
  'ai.error.noResponseBody': 'Няма отговор от услугата за изкуствен интелект.',
}
