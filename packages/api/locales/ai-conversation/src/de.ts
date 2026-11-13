import type { ConversationTranslations } from './types.js'

/** Conversation translations for German. */
export const de: ConversationTranslations = {
  'conversation.error.messageRequired': 'Nachricht ist erforderlich',
  'conversation.error.aiNotConfigured': 'KI-Anbieter nicht konfiguriert',
  'conversation.error.unknownAiError': 'Unbekannter KI-Fehler',
  'conversation.error.notFound': 'Keine Konversation gefunden',
  'conversation.error.streamError': 'KI-Streaming-Fehler',
  'conversation.error.forbidden': 'Zugriff verweigert',
  'conversation.error.unauthorized': 'Nicht autorisiert',
  'conversation.error.clearFailed': 'Gespräch konnte nicht abgeschlossen werden',
  'conversation.error.idRequired':
    'conversationId ist erforderlich, wenn das Projekt mehr als eine Konversation enthält.',
  'conversation.error.historyFailed': 'Konversationsverlauf konnte nicht geladen werden',
  'conversation.error.readFailed': 'Konversation konnte nicht gelesen werden',
  'conversation.error.updateFailed': 'Konversation konnte nicht aktualisiert werden',
}
