import type { MessageTranslations } from './types.js'

/** Message resource translations for Italian. */
export const it: MessageTranslations = {
  'message.error.deleteFailed': 'Impossibile eliminare il messaggio',
  'message.error.editFailed': 'Impossibile modificare il messaggio',
  'message.error.listMessagesFailed': 'Impossibile elencare i messaggi',
  'message.error.listThreadsFailed': 'Impossibile elencare le conversazioni',
  'message.error.markReadFailed': 'Impossibile contrassegnare la conversazione come letta',
  'message.error.messageNotFound': 'Messaggio non trovato o non modificabile',
  'message.error.missingMessageId': "L'ID del messaggio è obbligatorio",
  'message.error.missingThreadId': "L'ID della conversazione è obbligatorio",
  'message.error.notParticipant': 'Non sei un partecipante di questa conversazione',
  'message.error.readThreadFailed': 'Impossibile leggere la conversazione',
  'message.error.selfThread': 'Non puoi avviare una conversazione con te stesso',
  'message.error.sendFailed': 'Impossibile inviare il messaggio',
  'message.error.threadCreateFailed': 'Impossibile creare la conversazione',
  'message.error.threadNotFound': 'Conversazione non trovata',
  'message.error.unreadCountFailed': 'Impossibile ottenere il conteggio dei non letti',
  'message.error.validationFailed': 'Convalida non riuscita',
  'message.system.conversationStarted': '{{name}} ha avviato una conversazione',
  'message.system.messageDeleted': 'Questo messaggio è stato eliminato',
}
