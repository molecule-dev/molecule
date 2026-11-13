import type { AiTranslations } from './types.js'

/** Ai translations for Croatian. */
export const hr: AiTranslations = {
  'ai.error.noProvider': 'AI pružatelj nije konfiguriran. Prvo povežite AI pružatelja.',
  'ai.error.ambiguousProvider':
    'Povezano je više imenovanih AI pružatelja, a zadani nije postavljen. Upotrijebite getProviderByName(name) za odabir jednog.',
  'ai.error.responseIncomplete':
    'Odgovor umjetne inteligencije završio je prije završetka. Pokušajte ponovno.',
  'ai.error.responseTokenLimit':
    'Odgovor umjetne inteligencije dosegao je ograničenje izlaznih tokena prije završetka.',
  'ai.error.apiError': 'Pogreška AI usluge. Pokušajte ponovno.',
  'ai.error.noResponseBody': 'Nema odgovora od AI servisa.',
}
