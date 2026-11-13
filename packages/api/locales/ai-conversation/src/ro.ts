import type { ConversationTranslations } from './types.js'

/** Conversation translations for Romanian. */
export const ro: ConversationTranslations = {
  'conversation.error.messageRequired': 'Mesajul este obligatoriu',
  'conversation.error.aiNotConfigured': 'Furnizorul de IA nu este configurat',
  'conversation.error.unknownAiError': 'Eroare IA necunoscută',
  'conversation.error.notFound': 'Nicio conversație găsită',
  'conversation.error.streamError': 'Eroare de transmisie IA',
  'conversation.error.forbidden': 'Acces interzis',
  'conversation.error.unauthorized': 'Neautorizat',
  'conversation.error.clearFailed': 'Conversația nu a putut fi ștersă',
  'conversation.error.idRequired':
    'conversationId este obligatoriu atunci când proiectul are mai mult de o conversație',
  'conversation.error.historyFailed': 'Istoricul conversațiilor nu a putut fi încărcat.',
  'conversation.error.readFailed': 'Conversația nu a putut fi citită',
  'conversation.error.updateFailed': 'Conversația nu a putut fi actualizată',
}
