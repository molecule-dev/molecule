import type { ConversationTranslations } from './types.js'

/** Conversation translations for Czech. */
export const cs: ConversationTranslations = {
  'conversation.error.messageRequired': 'message je povinný',
  'conversation.error.aiNotConfigured': 'AI poskytovatel není nakonfigurován',
  'conversation.error.unknownAiError': 'Neznámá AI chyba',
  'conversation.error.notFound': 'Konverzace nenalezena',
  'conversation.error.streamError': 'Chyba AI streamování',
  'conversation.error.forbidden': 'Přístup odepřen',
  'conversation.error.unauthorized': 'Neoprávněný',
  'conversation.error.clearFailed': 'Nepodařilo se vymazat konverzaci',
  'conversation.error.idRequired':
    'conversationId je povinné, pokud má projekt více než jednu konverzaci.',
  'conversation.error.historyFailed': 'Nepodařilo se načíst historii konverzace',
  'conversation.error.readFailed': 'Nepodařilo se přečíst konverzaci',
  'conversation.error.updateFailed': 'Nepodařilo se aktualizovat konverzaci',
}
