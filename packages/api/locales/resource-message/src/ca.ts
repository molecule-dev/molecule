import type { MessageTranslations } from './types.js'

/** Message resource translations for Catalan. */
export const ca: MessageTranslations = {
  'message.error.deleteFailed': "No s'ha pogut eliminar el missatge",
  'message.error.editFailed': "No s'ha pogut editar el missatge",
  'message.error.listMessagesFailed': "No s'han pogut llistar els missatges",
  'message.error.listThreadsFailed': "No s'han pogut llistar les converses",
  'message.error.markReadFailed': "No s'ha pogut marcar la conversa com a llegida",
  'message.error.messageNotFound': 'Missatge no trobat o no editable',
  'message.error.missingMessageId': "Cal l'identificador del missatge",
  'message.error.missingThreadId': "Cal l'identificador de la conversa",
  'message.error.notParticipant': 'No ets participant en aquesta conversa',
  'message.error.readThreadFailed': "No s'ha pogut llegir la conversa",
  'message.error.selfThread': 'No pots iniciar una conversa amb tu mateix',
  'message.error.sendFailed': "No s'ha pogut enviar el missatge",
  'message.error.threadCreateFailed': "No s'ha pogut crear la conversa",
  'message.error.threadNotFound': 'Conversa no trobada',
  'message.error.unreadCountFailed': "No s'ha pogut obtenir el recompte de no llegits",
  'message.error.validationFailed': 'La validació ha fallat',
  'message.system.conversationStarted': '{{name}} ha iniciat una conversa',
  'message.system.messageDeleted': "Aquest missatge s'ha eliminat",
}
