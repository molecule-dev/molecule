import type { AiTranslations } from './types.js'

/** Ai translations for Polish. */
export const pl: AiTranslations = {
  'ai.error.noProvider': 'Dostawca AI nie jest skonfigurowany. Najpierw podłącz dostawcę AI.',
  'ai.error.ambiguousProvider':
    'Podłączono wielu nazwanych dostawców AI i nie ustawiono domyślnego. Użyj getProviderByName(name), aby wybrać jednego.',
  'ai.error.responseIncomplete':
    'Odpowiedź AI zakończyła się przed zakończeniem. Spróbuj ponownie.',
  'ai.error.responseTokenLimit':
    'Odpowiedź AI osiągnęła limit tokenów wyjściowych przed zakończeniem.',
  'ai.error.apiError': 'Błąd usługi AI. Spróbuj ponownie.',
  'ai.error.noResponseBody': 'Brak odpowiedzi od serwisu AI.',
}
