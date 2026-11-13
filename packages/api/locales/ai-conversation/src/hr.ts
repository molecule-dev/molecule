import type { ConversationTranslations } from './types.js'

/** Conversation translations for Croatian. */
export const hr: ConversationTranslations = {
  'conversation.error.messageRequired': 'message je obavezan',
  'conversation.error.aiNotConfigured': 'AI pružatelj nije konfiguriran',
  'conversation.error.unknownAiError': 'Nepoznata AI pogreška',
  'conversation.error.notFound': 'Razgovor nije pronađen',
  'conversation.error.streamError': 'Pogreška AI strujanja',
  'conversation.error.forbidden': 'Pristup odbijen',
  'conversation.error.unauthorized': 'Neovlašteno',
  'conversation.error.clearFailed': 'Brisanje razgovora nije uspjelo',
  'conversation.error.idRequired':
    'ID razgovora je potreban kada projekt ima više od jednog razgovora',
  'conversation.error.historyFailed': 'Nije uspjelo učitavanje povijesti razgovora',
  'conversation.error.readFailed': 'Nije moguće pročitati razgovor',
  'conversation.error.updateFailed': 'Nije uspjelo ažuriranje razgovora',
}
