import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Portuguese. */
export const pt: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Sem corpo de resposta',
  'chat.error.streamError': 'Erro de transmissão',
  'chat.error.unknownError': 'Erro desconhecido',
  'chat.error.sendFailed': 'Falha ao enviar mensagem',
  'chat.error.stalled':
    '{{agentName}} parou de responder. Ele pode ainda estar sendo processado em segundo plano — atualize a página para ver as informações mais recentes ou envie uma nova mensagem.',
}
