import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Croatian. */
export const hr: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Nema tijela odgovora',
  'chat.error.streamError': 'Pogreška strujanja',
  'chat.error.unknownError': 'Nepoznata pogreška',
  'chat.error.sendFailed': 'Slanje poruke nije uspjelo',
  'chat.error.stalled':
    '{{agentName}} je prestao odgovarati. Moguće je da se još uvijek dovršava u pozadini — ponovno učitajte da biste vidjeli najnovije ili pošaljite novu poruku.',
}
