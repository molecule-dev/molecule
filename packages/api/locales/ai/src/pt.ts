import type { AiTranslations } from './types.js'

/** Ai translations for Portuguese. */
export const pt: AiTranslations = {
  'ai.error.noProvider': 'Provedor de IA não configurado. Vincule um provedor de IA primeiro.',
  'ai.error.ambiguousProvider':
    'Vários provedores de IA nomeados estão vinculados e nenhum padrão foi definido. Use getProviderByName(name) para selecionar um.',
  'ai.error.responseIncomplete':
    'A resposta da IA foi interrompida antes da conclusão. Tente novamente.',
  'ai.error.responseTokenLimit':
    'A resposta da IA atingiu o limite de tokens de saída antes de ser concluída.',
  'ai.error.apiError': 'Erro no serviço de IA. Tente novamente.',
  'ai.error.noResponseBody': 'Nenhuma resposta do serviço de IA.',
}
