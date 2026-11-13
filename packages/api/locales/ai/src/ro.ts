import type { AiTranslations } from './types.js'

/** Ai translations for Romanian. */
export const ro: AiTranslations = {
  'ai.error.noProvider': 'Furnizorul AI nu este configurat. Conectați mai întâi un furnizor AI.',
  'ai.error.ambiguousProvider':
    'Sunt conectați mai mulți furnizori AI numiți și nu a fost setat niciun implicit. Utilizați getProviderByName(name) pentru a selecta unul.',
  'ai.error.responseIncomplete':
    'Răspunsul AI s-a încheiat înainte de finalizare. Vă rugăm să încercați din nou.',
  'ai.error.responseTokenLimit':
    'Răspunsul AI a atins limita de token-uri de ieșire înainte de finalizare.',
  'ai.error.apiError': 'Eroare serviciu AI. Vă rugăm să încercați din nou.',
  'ai.error.noResponseBody': 'Niciun răspuns de la serviciul de inteligență artificială.',
}
