import type { AiTranslations } from './types.js'

/** Ai translations for Italian. */
export const it: AiTranslations = {
  'ai.error.noProvider': 'Provider AI non configurato. Collegare prima un provider AI.',
  'ai.error.ambiguousProvider':
    'Sono collegati più provider AI denominati e non è stato impostato alcun predefinito. Usa getProviderByName(name) per selezionarne uno.',
  'ai.error.responseIncomplete':
    "La risposta dell'IA si è interrotta prima del completamento. Riprova.",
  'ai.error.responseTokenLimit':
    "La risposta dell'IA ha raggiunto il limite di token di output prima del completamento.",
  'ai.error.apiError': 'Errore del servizio AI. Riprova.',
  'ai.error.noResponseBody': 'Nessuna risposta dal servizio di intelligenza artificiale.',
}
