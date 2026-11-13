import type { ConversationTranslations } from './types.js'

/** Conversation translations for Bosnian. */
export const bs: ConversationTranslations = {
  'conversation.error.messageRequired': 'message je obavezan',
  'conversation.error.aiNotConfigured': 'AI provider nije konfigurisan',
  'conversation.error.unknownAiError': 'Nepoznata AI greška',
  'conversation.error.notFound': 'Razgovor nije pronađen',
  'conversation.error.streamError': 'Greška AI streaminga',
  'conversation.error.forbidden': 'Pristup odbijen',
  'conversation.error.unauthorized': 'Neovlašteno',
  'conversation.error.clearFailed': 'Brisanje razgovora nije uspjelo',
  'conversation.error.idRequired':
    'ID razgovora je potreban kada projekat ima više od jednog razgovora',
  'conversation.error.historyFailed': 'Nije uspjelo učitavanje historije razgovora',
  'conversation.error.readFailed': 'Nije moguće pročitati razgovor',
  'conversation.error.updateFailed': 'Ažuriranje razgovora nije uspjelo',
}
