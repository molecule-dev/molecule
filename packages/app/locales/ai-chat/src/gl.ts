import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Galician. */
export const gl: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Sen corpo de resposta',
  'chat.error.streamError': 'Erro de transmisión',
  'chat.error.unknownError': 'Erro descoñecido',
  'chat.error.sendFailed': 'Non se puido enviar a mensaxe',
  'chat.error.stalled':
    '{{agentName}} deixou de responder. Pode que aínda estea a finalizar en segundo plano. Volva cargar a páxina para ver as últimas novidades ou envíe unha nova mensaxe.',
  'aiChat.error.noProvider':
    'O provedor de chat de IA non está configurado. Primeiro, conecta un provedor de chat de IA.',
}
