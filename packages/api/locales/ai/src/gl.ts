import type { AiTranslations } from './types.js'

/** Ai translations for Galician. */
export const gl: AiTranslations = {
  'ai.error.noProvider':
    'O provedor de IA non está configurado. Vincule primeiro un provedor de IA.',
  'ai.error.ambiguousProvider':
    'Hai varios provedores de IA con nome vinculados e non se estableceu ningún por defecto. Use getProviderByName(name) para seleccionar un.',
  'ai.error.responseIncomplete':
    'A resposta da IA rematou antes de que se completase. Téntao de novo.',
  'ai.error.responseTokenLimit':
    'A resposta da IA alcanzou o límite de tokens de saída antes de completarse.',
  'ai.error.apiError': 'Erro do servizo de IA. Téntao de novo.',
  'ai.error.noResponseBody': 'Sen resposta do servizo de IA.',
}
