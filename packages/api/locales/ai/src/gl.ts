import type { AiTranslations } from './types.js'

/** Ai translations for Galician. */
export const gl: AiTranslations = {
  'ai.error.noProvider':
    'O provedor de IA non está configurado. Vincule primeiro un provedor de IA.',
  'ai.error.apiError': 'A solicitude á API de IA fallou.',
  'ai.error.noResponseBody': 'O corpo da resposta de IA está baleiro.',
  'ai.error.ambiguousProvider':
    'Hai varios provedores de IA con nome vinculados e non se estableceu ningún por defecto. Use getProviderByName(name) para seleccionar un.',
}
