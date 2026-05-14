import type { MessageTranslations } from './types.js'

/** Message resource translations for French. */
export const fr: MessageTranslations = {
  'message.error.deleteFailed': 'Échec de la suppression du message',
  'message.error.editFailed': 'Échec de la modification du message',
  'message.error.listMessagesFailed': 'Échec de la liste des messages',
  'message.error.listThreadsFailed': 'Échec de la liste des conversations',
  'message.error.markReadFailed': 'Échec du marquage de la conversation comme lue',
  'message.error.messageNotFound': 'Message introuvable ou non modifiable',
  'message.error.missingMessageId': "L'identifiant du message est requis",
  'message.error.missingThreadId': "L'identifiant de la conversation est requis",
  'message.error.notParticipant': "Vous n'êtes pas participant à cette conversation",
  'message.error.readThreadFailed': 'Échec de la lecture de la conversation',
  'message.error.selfThread': 'Vous ne pouvez pas démarrer une conversation avec vous-même',
  'message.error.sendFailed': "Échec de l'envoi du message",
  'message.error.threadCreateFailed': 'Échec de la création de la conversation',
  'message.error.threadNotFound': 'Conversation introuvable',
  'message.error.unreadCountFailed': 'Échec de la récupération du nombre de non lus',
  'message.error.validationFailed': 'La validation a échoué',
  'message.system.conversationStarted': '{{name}} a démarré une conversation',
  'message.system.messageDeleted': 'Ce message a été supprimé',
}
