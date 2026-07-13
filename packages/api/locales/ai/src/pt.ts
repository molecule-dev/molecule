import type { AiTranslations } from './types.js'

/** Ai translations for Portuguese. */
export const pt: AiTranslations = {
  'ai.error.noProvider': 'Provedor de IA não configurado. Vincule um provedor de IA primeiro.',
  'ai.error.apiError': 'Falha na solicitação da API de IA.',
  'ai.error.noResponseBody': 'O corpo da resposta de IA está vazio.',
  'ai.error.ambiguousProvider':
    'Vários provedores de IA nomeados estão vinculados e nenhum padrão foi definido. Use getProviderByName(name) para selecionar um.',
}
