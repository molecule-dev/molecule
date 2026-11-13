import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Slovenian. */
export const sl: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Ni telesa odgovora',
  'chat.error.streamError': 'Napaka pretakanja',
  'chat.error.unknownError': 'Neznana napaka',
  'chat.error.sendFailed': 'Sporočila ni bilo mogoče poslati',
  'chat.error.stalled':
    '{{agentName}} se je nehal odzivati. Morda se še vedno nalaga v ozadju – znova naložite, da si ogledate najnovejše podatke, ali pošljite novo sporočilo.',
}
