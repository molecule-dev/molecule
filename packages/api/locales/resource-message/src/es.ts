import type { MessageTranslations } from './types.js'

/** Message resource translations for Spanish. */
export const es: MessageTranslations = {
  'message.error.deleteFailed': 'No se pudo eliminar el mensaje',
  'message.error.editFailed': 'No se pudo editar el mensaje',
  'message.error.listMessagesFailed': 'No se pudieron listar los mensajes',
  'message.error.listThreadsFailed': 'No se pudieron listar las conversaciones',
  'message.error.markReadFailed': 'No se pudo marcar la conversación como leída',
  'message.error.messageNotFound': 'Mensaje no encontrado o no editable',
  'message.error.missingMessageId': 'Se requiere el ID del mensaje',
  'message.error.missingThreadId': 'Se requiere el ID de la conversación',
  'message.error.notParticipant': 'No eres participante de esta conversación',
  'message.error.readThreadFailed': 'No se pudo leer la conversación',
  'message.error.selfThread': 'No puedes iniciar una conversación contigo mismo',
  'message.error.sendFailed': 'No se pudo enviar el mensaje',
  'message.error.threadCreateFailed': 'No se pudo crear la conversación',
  'message.error.threadNotFound': 'Conversación no encontrada',
  'message.error.unreadCountFailed': 'No se pudo obtener el recuento de no leídos',
  'message.error.validationFailed': 'La validación falló',
  'message.system.conversationStarted': '{{name}} inició una conversación',
  'message.system.messageDeleted': 'Este mensaje fue eliminado',
}
