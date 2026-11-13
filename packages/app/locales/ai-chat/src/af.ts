import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Afrikaans. */
export const af: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Geen antwoordinhoud nie',
  'chat.error.streamError': 'Stroomfout',
  'chat.error.unknownError': 'Onbekende fout',
  'chat.error.sendFailed': 'Kon nie boodskap stuur nie',
  'chat.error.stalled':
    "{{agentName}} het opgehou reageer. Dit mag dalk steeds in die agtergrond klaar wees — herlaai om die nuutste te sien, of stuur 'n nuwe boodskap.",
}
