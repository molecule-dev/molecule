import type { AiTranslations } from './types.js'

/** Ai translations for Catalan. */
export const ca: AiTranslations = {
  'ai.error.noProvider': "El proveïdor d'IA no està configurat. Vinculeu primer un proveïdor d'IA.",
  'ai.error.ambiguousProvider':
    "S'han vinculat diversos proveïdors d'IA amb nom i no s'ha establert cap per defecte. Utilitzeu getProviderByName(name) per seleccionar-ne un.",
  'ai.error.responseIncomplete':
    'La resposta de la IA ha finalitzat abans de la finalització. Torna-ho a provar.',
  'ai.error.responseTokenLimit':
    'La resposta de la IA ha arribat al límit de tokens de sortida abans de la finalització.',
  'ai.error.apiError': "Error del servei d'IA. Si us plau, torneu-ho a provar.",
  'ai.error.noResponseBody': "Cap resposta del servei d'IA.",
}
