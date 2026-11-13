import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Estonian. */
export const et: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Vastuse keha puudub',
  'chat.error.streamError': 'Voogesituse viga',
  'chat.error.unknownError': 'Tundmatu viga',
  'chat.error.sendFailed': 'Sõnumi saatmine ebaõnnestus',
  'chat.error.stalled':
    '{{agentName}} ei reageeri enam. See võib taustal veel lõpetada – laadige uuesti, et näha uusimat või saatke uus sõnum.',
}
