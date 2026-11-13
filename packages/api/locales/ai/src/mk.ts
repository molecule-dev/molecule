import type { AiTranslations } from './types.js'

/** Ai translations for Macedonian. */
export const mk: AiTranslations = {
  'ai.error.noProvider': 'AI провајдерот не е конфигуриран. Прво поврзете AI провајдер.',
  'ai.error.ambiguousProvider':
    'Поврзани се повеќе именувани AI провајдери и не е поставен стандарден. Користете getProviderByName(name) за да изберете еден.',
  'ai.error.responseIncomplete':
    'Одговорот на вештачката интелигенција заврши пред да се заврши. Обидете се повторно.',
  'ai.error.responseTokenLimit':
    'Одговорот на вештачката интелигенција го достигна ограничувањето на излезните токени пред да се заврши.',
  'ai.error.apiError': 'Грешка во услугата за вештачка интелигенција. Обидете се повторно.',
  'ai.error.noResponseBody': 'Нема одговор од услугата за вештачка интелигенција.',
}
