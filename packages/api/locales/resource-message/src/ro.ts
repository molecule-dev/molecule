import type { MessageTranslations } from './types.js'

/** Message resource translations for Romanian. */
export const ro: MessageTranslations = {
  'message.error.deleteFailed': 'Nu s-a putut șterge mesajul',
  'message.error.editFailed': 'Nu s-a putut edita mesajul',
  'message.error.listMessagesFailed': 'Nu s-au putut lista mesajele',
  'message.error.listThreadsFailed': 'Nu s-au putut lista conversațiile',
  'message.error.markReadFailed': 'Nu s-a putut marca conversația ca citită',
  'message.error.messageNotFound': 'Mesajul nu a fost găsit sau nu poate fi editat',
  'message.error.missingMessageId': 'Este necesar ID-ul mesajului',
  'message.error.missingThreadId': 'Este necesar ID-ul conversației',
  'message.error.notParticipant': 'Nu sunteți participant la această conversație',
  'message.error.readThreadFailed': 'Nu s-a putut citi conversația',
  'message.error.selfThread': 'Nu puteți începe o conversație cu dvs.',
  'message.error.sendFailed': 'Nu s-a putut trimite mesajul',
  'message.error.threadCreateFailed': 'Nu s-a putut crea conversația',
  'message.error.threadNotFound': 'Conversația nu a fost găsită',
  'message.error.unreadCountFailed': 'Nu s-a putut obține numărul de mesaje necitite',
  'message.error.validationFailed': 'Validarea a eșuat',
  'message.system.conversationStarted': '{{name}} a început o conversație',
  'message.system.messageDeleted': 'Acest mesaj a fost șters',
}
