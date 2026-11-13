import type { ChatTranslations } from './types.js'

/** Ai Chat translations for German. */
export const de: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Kein Antwortinhalt',
  'chat.error.streamError': 'Streaming-Fehler',
  'chat.error.unknownError': 'Unbekannter Fehler',
  'chat.error.sendFailed': 'Nachricht konnte nicht gesendet werden',
  'chat.error.stalled':
    '{{agentName}} reagiert nicht mehr. Die Verarbeitung läuft möglicherweise noch im Hintergrund – aktualisieren Sie die Seite, um den aktuellen Status anzuzeigen, oder senden Sie eine neue Nachricht.',
}
