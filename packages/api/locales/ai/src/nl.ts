import type { AiTranslations } from './types.js'

/** Ai translations for Dutch. */
export const nl: AiTranslations = {
  'ai.error.noProvider': 'AI-provider is niet geconfigureerd. Koppel eerst een AI-provider.',
  'ai.error.ambiguousProvider':
    'Er zijn meerdere benoemde AI-providers gebonden en er is geen standaard ingesteld. Gebruik getProviderByName(name) om er een te selecteren.',
  'ai.error.responseIncomplete': 'Het AI-antwoord is voortijdig beëindigd. Probeer het opnieuw.',
  'ai.error.responseTokenLimit':
    'De AI-respons bereikte de limiet voor uitvoertokens voordat deze voltooid was.',
  'ai.error.apiError': 'Fout in de AI-service. Probeer het opnieuw.',
  'ai.error.noResponseBody': 'Geen reactie van de AI-service.',
}
