import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Slovak. */
export const sk: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Žiadne telo odpovede',
  'chat.error.streamError': 'Chyba streamovania',
  'chat.error.unknownError': 'Neznáma chyba',
  'chat.error.sendFailed': 'Nepodarilo sa odoslať správu',
  'chat.error.stalled':
    '{{agentName}} prestal reagovať. Možno sa stále dokončuje na pozadí – znova načítajte, ak chcete zobraziť najnovšie informácie, alebo odošlite novú správu.',
}
