import type { ConversationTranslations } from './types.js'

/** Conversation translations for Slovak. */
export const sk: ConversationTranslations = {
  'conversation.error.messageRequired': 'message je povinný',
  'conversation.error.aiNotConfigured': 'AI poskytovateľ nie je nakonfigurovaný',
  'conversation.error.unknownAiError': 'Neznáma AI chyba',
  'conversation.error.notFound': 'Konverzácia nenájdená',
  'conversation.error.streamError': 'Chyba AI streamovania',
  'conversation.error.forbidden': 'Prístup zamietnutý',
  'conversation.error.unauthorized': 'Neoprávnené',
  'conversation.error.clearFailed': 'Nepodarilo sa vymazať konverzáciu',
  'conversation.error.idRequired':
    'conversationId je povinný, ak má projekt viac ako jednu konverzáciu.',
  'conversation.error.historyFailed': 'Nepodarilo sa načítať históriu konverzácie',
  'conversation.error.readFailed': 'Nepodarilo sa prečítať konverzáciu',
  'conversation.error.updateFailed': 'Nepodarilo sa aktualizovať konverzáciu',
}
