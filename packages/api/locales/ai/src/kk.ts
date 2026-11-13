import type { AiTranslations } from './types.js'

/** Ai translations for Kazakh. */
export const kk: AiTranslations = {
  'ai.error.noProvider':
    'AI провайдері конфигурацияланбаған. Алдымен AI провайдерін байланыстырыңыз.',
  'ai.error.ambiguousProvider':
    'Бірнеше аталған AI провайдері байланыстырылған және әдепкі орнатылмаған. Біреуін таңдау үшін getProviderByName(name) пайдаланыңыз.',
  'ai.error.responseIncomplete':
    'Жасанды интеллект жауабы аяқталмай тұрып аяқталды. Қайталап көріңіз.',
  'ai.error.responseTokenLimit':
    'Жасанды интеллект жауабы аяқталмай тұрып шығыс токенінің шегіне жетті.',
  'ai.error.apiError': 'Жасанды интеллект қызметіндегі қате. Қайталап көріңіз.',
  'ai.error.noResponseBody': 'Жасанды интеллект қызметінен жауап жоқ.',
}
