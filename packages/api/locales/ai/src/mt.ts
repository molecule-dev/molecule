import type { AiTranslations } from './types.js'

/** Ai translations for Maltese. */
export const mt: AiTranslations = {
  'ai.error.noProvider': 'Il-fornitur tal-AI mhux ikkonfigurat. Qabbad fornitur tal-AI l-ewwel.',
  'ai.error.ambiguousProvider':
    'Diversi fornituri tal-AI msemmija huma mqabbda u ma ġie stabbilit l-ebda default. Uża getProviderByName(name) biex tagħżel wieħed.',
  'ai.error.responseIncomplete':
    "Ir-risposta tal-AI ntemmet qabel ma tlestiet. Jekk jogħġbok erġa' pprova.",
  'ai.error.responseTokenLimit':
    'Ir-rispons tal-AI laħaq il-limitu tat-token tal-output qabel it-tlestija.',
  'ai.error.apiError': "Żball fis-servizz tal-AI. Jekk jogħġbok erġa' pprova.",
  'ai.error.noResponseBody': 'L-ebda tweġiba mis-servizz tal-AI.',
}
