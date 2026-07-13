import type { AiTranslations } from './types.js'

/** Ai translations for Kazakh. */
export const kk: AiTranslations = {
  'ai.error.noProvider':
    'AI провайдері конфигурацияланбаған. Алдымен AI провайдерін байланыстырыңыз.',
  'ai.error.apiError': 'AI API сұрауы сәтсіз аяқталды.',
  'ai.error.noResponseBody': 'AI жауап денесі бос.',
  'ai.error.ambiguousProvider':
    'Бірнеше аталған AI провайдері байланыстырылған және әдепкі орнатылмаған. Біреуін таңдау үшін getProviderByName(name) пайдаланыңыз.',
}
