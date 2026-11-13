import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Romanian. */
export const ro: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Niciun corp al răspunsului',
  'chat.error.streamError': 'Eroare de transmisie',
  'chat.error.unknownError': 'Eroare necunoscută',
  'chat.error.sendFailed': 'Mesajul nu a fost trimis',
  'chat.error.stalled':
    '{{agentName}} nu a mai răspuns. Este posibil să se finalizeze încă în fundal — reîncărcați pentru a vedea cele mai recente sau trimiteți un mesaj nou.',
  'aiChat.error.noProvider':
    'Furnizorul de chat cu inteligență artificială nu este configurat. Mai întâi conectați un furnizor de chat cu inteligență artificială.',
}
