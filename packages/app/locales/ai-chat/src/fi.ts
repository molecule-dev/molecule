import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Finnish. */
export const fi: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Vastauksen runko puuttuu',
  'chat.error.streamError': 'Suoratoistovirhe',
  'chat.error.unknownError': 'Tuntematon virhe',
  'chat.error.sendFailed': 'Viestin lähettäminen epäonnistui',
  'chat.error.stalled':
    '{{agentName}} lakkasi vastaamasta. Se saattaa olla vielä viimeistelemässä taustalla – lataa sivu uudelleen nähdäksesi uusimmat tai lähetä uusi viesti.',
  'aiChat.error.noProvider':
    'Tekoälychat-palveluntarjoajaa ei ole määritetty. Luo ensin sidonta tekoälychat-palveluntarjoajalle.',
}
