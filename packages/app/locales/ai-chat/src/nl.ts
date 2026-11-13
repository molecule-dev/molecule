import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Dutch. */
export const nl: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Geen antwoordinhoud',
  'chat.error.streamError': 'Streamingfout',
  'chat.error.unknownError': 'Onbekende fout',
  'chat.error.sendFailed': 'Het verzenden van het bericht is mislukt.',
  'chat.error.stalled':
    '{{agentName}} reageert niet meer. Het proces wordt mogelijk nog op de achtergrond afgerond. Vernieuw de pagina om de laatste updates te zien of stuur een nieuw bericht.',
}
