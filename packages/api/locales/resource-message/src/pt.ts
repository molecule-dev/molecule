import type { MessageTranslations } from './types.js'

/** Message resource translations for Portuguese. */
export const pt: MessageTranslations = {
  'message.error.deleteFailed': 'Falha ao excluir mensagem',
  'message.error.editFailed': 'Falha ao editar mensagem',
  'message.error.listMessagesFailed': 'Falha ao listar mensagens',
  'message.error.listThreadsFailed': 'Falha ao listar conversas',
  'message.error.markReadFailed': 'Falha ao marcar conversa como lida',
  'message.error.messageNotFound': 'Mensagem não encontrada ou não editável',
  'message.error.missingMessageId': 'O ID da mensagem é obrigatório',
  'message.error.missingThreadId': 'O ID da conversa é obrigatório',
  'message.error.notParticipant': 'Você não é participante desta conversa',
  'message.error.readThreadFailed': 'Falha ao ler conversa',
  'message.error.selfThread': 'Não é possível iniciar uma conversa consigo mesmo',
  'message.error.sendFailed': 'Falha ao enviar mensagem',
  'message.error.threadCreateFailed': 'Falha ao criar conversa',
  'message.error.threadNotFound': 'Conversa não encontrada',
  'message.error.unreadCountFailed': 'Falha ao obter contagem de não lidas',
  'message.error.validationFailed': 'A validação falhou',
  'message.system.conversationStarted': '{{name}} iniciou uma conversa',
  'message.system.messageDeleted': 'Esta mensagem foi excluída',
}
