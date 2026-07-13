import type { AiTranslations } from './types.js'

/** Ai translations for Italian. */
export const it: AiTranslations = {
  'ai.error.noProvider': 'Provider AI non configurato. Collegare prima un provider AI.',
  'ai.error.apiError': 'Richiesta API AI non riuscita.',
  'ai.error.noResponseBody': 'Il corpo della risposta AI è vuoto.',
  'ai.error.ambiguousProvider':
    'Sono collegati più provider AI denominati e non è stato impostato alcun predefinito. Usa getProviderByName(name) per selezionarne uno.',
}
