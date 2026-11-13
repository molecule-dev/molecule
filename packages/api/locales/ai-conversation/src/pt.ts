import type { ConversationTranslations } from './types.js'

/** Conversation translations for Portuguese. */
export const pt: ConversationTranslations = {
  'conversation.error.messageRequired': 'A mensagem é obrigatória',
  'conversation.error.aiNotConfigured': 'Fornecedor de IA não configurado',
  'conversation.error.unknownAiError': 'Erro de IA desconhecido',
  'conversation.error.notFound': 'Nenhuma conversa encontrada',
  'conversation.error.streamError': 'Erro de transmissão de IA',
  'conversation.error.forbidden': 'Acesso negado',
  'conversation.error.unauthorized': 'Não autorizado',
  'conversation.error.clearFailed': 'Falha ao encerrar a conversa',
  'conversation.error.idRequired':
    'O conversationId é obrigatório quando o projeto tem mais de uma conversa.',
  'conversation.error.historyFailed': 'Não foi possível carregar o histórico da conversa.',
  'conversation.error.readFailed': 'Não conseguiu ler a conversa.',
  'conversation.error.updateFailed': 'Falha ao atualizar a conversa',
}
