import type { MessageTranslations } from './types.js'

/** Message resource translations for Czech. */
export const cs: MessageTranslations = {
  'message.error.deleteFailed': 'Nepodařilo se odstranit zprávu',
  'message.error.editFailed': 'Nepodařilo se upravit zprávu',
  'message.error.listMessagesFailed': 'Nepodařilo se vypsat zprávy',
  'message.error.listThreadsFailed': 'Nepodařilo se vypsat konverzace',
  'message.error.markReadFailed': 'Nepodařilo se označit konverzaci jako přečtenou',
  'message.error.messageNotFound': 'Zpráva nebyla nalezena nebo ji nelze upravit',
  'message.error.missingMessageId': 'Je vyžadováno ID zprávy',
  'message.error.missingThreadId': 'Je vyžadováno ID konverzace',
  'message.error.notParticipant': 'Nejste účastníkem této konverzace',
  'message.error.readThreadFailed': 'Nepodařilo se přečíst konverzaci',
  'message.error.selfThread': 'Nelze zahájit konverzaci sami se sebou',
  'message.error.sendFailed': 'Nepodařilo se odeslat zprávu',
  'message.error.threadCreateFailed': 'Nepodařilo se vytvořit konverzaci',
  'message.error.threadNotFound': 'Konverzace nebyla nalezena',
  'message.error.unreadCountFailed': 'Nepodařilo se získat počet nepřečtených',
  'message.error.validationFailed': 'Ověření selhalo',
  'message.system.conversationStarted': '{{name}} zahájil konverzaci',
  'message.system.messageDeleted': 'Tato zpráva byla odstraněna',
}
