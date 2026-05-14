import type { MessageTranslations } from './types.js'

/** Message resource translations for Hungarian. */
export const hu: MessageTranslations = {
  'message.error.deleteFailed': 'Nem sikerült törölni az üzenetet',
  'message.error.editFailed': 'Nem sikerült szerkeszteni az üzenetet',
  'message.error.listMessagesFailed': 'Nem sikerült listázni az üzeneteket',
  'message.error.listThreadsFailed': 'Nem sikerült listázni a beszélgetéseket',
  'message.error.markReadFailed': 'Nem sikerült olvasottként megjelölni a beszélgetést',
  'message.error.messageNotFound': 'Az üzenet nem található vagy nem szerkeszthető',
  'message.error.missingMessageId': 'Az üzenetazonosító kötelező',
  'message.error.missingThreadId': 'A beszélgetésazonosító kötelező',
  'message.error.notParticipant': 'Ön nem résztvevője ennek a beszélgetésnek',
  'message.error.readThreadFailed': 'Nem sikerült beolvasni a beszélgetést',
  'message.error.selfThread': 'Nem kezdhet beszélgetést önmagával',
  'message.error.sendFailed': 'Nem sikerült elküldeni az üzenetet',
  'message.error.threadCreateFailed': 'Nem sikerült létrehozni a beszélgetést',
  'message.error.threadNotFound': 'A beszélgetés nem található',
  'message.error.unreadCountFailed': 'Nem sikerült lekérni az olvasatlanok számát',
  'message.error.validationFailed': 'Az ellenőrzés sikertelen',
  'message.system.conversationStarted': '{{name}} beszélgetést kezdett',
  'message.system.messageDeleted': 'Ezt az üzenetet törölték',
}
