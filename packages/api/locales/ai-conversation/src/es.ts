import type { ConversationTranslations } from './types.js'

/** Conversation translations for Spanish. */
export const es: ConversationTranslations = {
  'conversation.error.messageRequired': 'Se requiere un mensaje',
  'conversation.error.aiNotConfigured': 'Proveedor de IA no configurado',
  'conversation.error.unknownAiError': 'Error de IA desconocido',
  'conversation.error.notFound': 'No se encontró ninguna conversación',
  'conversation.error.streamError': 'Error de transmisión de IA',
  'conversation.error.forbidden': 'Acceso denegado',
  'conversation.error.unauthorized': 'No autorizado',
  'conversation.error.clearFailed': 'No se logró aclarar la conversación.',
  'conversation.error.idRequired':
    'El ID de conversación es obligatorio cuando el proyecto tiene más de una conversación.',
  'conversation.error.historyFailed': 'No se pudo cargar el historial de conversaciones.',
  'conversation.error.readFailed': 'No pudo leer la conversación',
  'conversation.error.updateFailed': 'No se pudo actualizar la conversación',
}
