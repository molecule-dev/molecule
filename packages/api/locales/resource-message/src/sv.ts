import type { MessageTranslations } from './types.js'

/** Message resource translations for Swedish. */
export const sv: MessageTranslations = {
  'message.error.deleteFailed': 'Det gick inte att ta bort meddelandet',
  'message.error.editFailed': 'Det gick inte att redigera meddelandet',
  'message.error.listMessagesFailed': 'Det gick inte att lista meddelanden',
  'message.error.listThreadsFailed': 'Det gick inte att lista konversationer',
  'message.error.markReadFailed': 'Det gick inte att markera konversationen som läst',
  'message.error.messageNotFound': 'Meddelandet hittades inte eller går inte att redigera',
  'message.error.missingMessageId': 'Meddelande-ID krävs',
  'message.error.missingThreadId': 'Konversations-ID krävs',
  'message.error.notParticipant': 'Du är inte deltagare i den här konversationen',
  'message.error.readThreadFailed': 'Det gick inte att läsa konversationen',
  'message.error.selfThread': 'Du kan inte starta en konversation med dig själv',
  'message.error.sendFailed': 'Det gick inte att skicka meddelandet',
  'message.error.threadCreateFailed': 'Det gick inte att skapa konversationen',
  'message.error.threadNotFound': 'Konversationen hittades inte',
  'message.error.unreadCountFailed': 'Det gick inte att hämta antalet olästa',
  'message.error.validationFailed': 'Valideringen misslyckades',
  'message.system.conversationStarted': '{{name}} startade en konversation',
  'message.system.messageDeleted': 'Det här meddelandet togs bort',
}
