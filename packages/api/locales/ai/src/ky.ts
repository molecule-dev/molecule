import type { AiTranslations } from './types.js'

/** Ai translations for Kyrgyz. */
export const ky: AiTranslations = {
  'ai.error.noProvider':
    'AI провайдери конфигурацияланган эмес. Адегенде AI провайдерин байланыштырыңыз.',
  'ai.error.ambiguousProvider':
    'Бир нече аталган AI провайдери байланыштырылган жана демейки орнотулган эмес. Бирөөнү тандоо үчүн getProviderByName(name) колдонуңуз.',
  'ai.error.responseIncomplete':
    'Жасалма интеллекттин жообу аягына чыга электе бүттү. Кайра аракет кылып көрүңүз.',
  'ai.error.responseTokenLimit':
    'Жасалма интеллекттин жообу аягына чыга электе чыгаруу токенинин чегине жетти.',
  'ai.error.apiError': 'Жасалма интеллект кызматынын катасы. Кайра аракет кылып көрүңүз.',
  'ai.error.noResponseBody': 'Жасалма интеллект кызматынан жооп жок.',
}
