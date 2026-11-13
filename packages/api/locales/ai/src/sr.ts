import type { AiTranslations } from './types.js'

/** Ai translations for Serbian. */
export const sr: AiTranslations = {
  'ai.error.noProvider': 'AI провајдер није конфигурисан. Прво повежите AI провајдера.',
  'ai.error.ambiguousProvider':
    'Повезано је више именованих AI провајдера и није постављен подразумевани. Користите getProviderByName(name) да изаберете једног.',
  'ai.error.responseIncomplete':
    'Одговор вештачке интелигенције је завршен пре завршетка. Молимо покушајте поново.',
  'ai.error.responseTokenLimit':
    'Одговор вештачке интелигенције је достигао ограничење излазних токена пре завршетка.',
  'ai.error.apiError': 'Грешка AI сервиса. Молимо покушајте поново.',
  'ai.error.noResponseBody': 'Нема одговора од AI сервиса.',
}
