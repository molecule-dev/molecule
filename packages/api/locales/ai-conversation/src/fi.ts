import type { ConversationTranslations } from './types.js'

/** Conversation translations for Finnish. */
export const fi: ConversationTranslations = {
  'conversation.error.messageRequired': 'Viesti vaaditaan',
  'conversation.error.aiNotConfigured': 'AI-palveluntarjoajaa ei ole määritetty',
  'conversation.error.unknownAiError': 'Tuntematon AI-virhe',
  'conversation.error.notFound': 'Keskustelua ei löytynyt',
  'conversation.error.streamError': 'AI-suoratoistovirhe',
  'conversation.error.forbidden': 'Käyttö estetty',
  'conversation.error.unauthorized': 'Luvaton',
  'conversation.error.clearFailed': 'Keskustelun tyhjentäminen epäonnistui',
  'conversation.error.idRequired':
    'conversationId on pakollinen, kun projektissa on useampi kuin yksi keskustelu',
  'conversation.error.historyFailed': 'Keskusteluhistorian lataaminen epäonnistui',
  'conversation.error.readFailed': 'Keskustelun lukeminen epäonnistui',
  'conversation.error.updateFailed': 'Keskustelun päivittäminen epäonnistui',
}
