import type { AiTranslations } from './types.js'

/** Ai translations for Bosnian. */
export const bs: AiTranslations = {
  'ai.error.noProvider': 'AI provajder nije konfigurisan. Prvo povežite AI provajdera.',
  'ai.error.ambiguousProvider':
    'Povezano je više imenovanih AI provajdera i nije postavljen podrazumijevani. Koristite getProviderByName(name) da odaberete jednog.',
  'ai.error.responseIncomplete':
    'Odgovor umjetne inteligencije je završen prije završetka. Molimo pokušajte ponovo.',
  'ai.error.responseTokenLimit':
    'Odgovor umjetne inteligencije je dostigao ograničenje izlaznih tokena prije završetka.',
  'ai.error.apiError': 'Greška AI servisa. Pokušajte ponovo.',
  'ai.error.noResponseBody': 'Nema odgovora od AI servisa.',
}
