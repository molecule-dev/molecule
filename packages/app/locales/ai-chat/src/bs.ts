import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Bosnian. */
export const bs: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Nema tijela odgovora',
  'chat.error.streamError': 'Greška streaminga',
  'chat.error.unknownError': 'Nepoznata greška',
  'chat.error.sendFailed': 'Slanje poruke nije uspjelo',
  'chat.error.stalled':
    '{{agentName}} je prestao odgovarati. Moguće je da se još uvijek završava u pozadini — ponovo učitajte da biste vidjeli najnovije ili pošaljite novu poruku.',
}
