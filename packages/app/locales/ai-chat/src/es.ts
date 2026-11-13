import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Spanish. */
export const es: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Sin cuerpo de respuesta',
  'chat.error.streamError': 'Error de transmisión',
  'chat.error.unknownError': 'Error desconocido',
  'chat.error.sendFailed': 'No se pudo enviar el mensaje.',
  'chat.error.stalled':
    '{{agentName}} dejó de responder. Es posible que aún esté finalizando en segundo plano; actualice la página para ver la última versión o envíe un nuevo mensaje.',
}
