import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Serbian. */
export const sr: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Нема тела одговора',
  'chat.error.streamError': 'Грешка стримовања',
  'chat.error.unknownError': 'Непозната грешка',
  'chat.error.sendFailed': 'Слање поруке није успело',
  'chat.error.stalled':
    '{{agentName}} је престао да реагује. Можда се још увек завршава у позадини — поново учитајте да бисте видели најновије или пошаљите нову поруку.',
}
