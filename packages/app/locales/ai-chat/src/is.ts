import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Icelandic. */
export const is: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Ekkert svarinnihald',
  'chat.error.streamError': 'Straumsvilla',
  'chat.error.unknownError': 'Óþekkt villa',
  'chat.error.sendFailed': 'Mistókst að senda skilaboð',
  'chat.error.stalled':
    '{{agentName}} hætti að svara. Það gæti enn verið að klára í bakgrunni — endurhlaðið til að sjá nýjustu fréttirnar eða sendið ný skilaboð.',
}
