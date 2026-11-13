import type { AiTranslations } from './types.js'

/** Ai translations for Norwegian Bokmål. */
export const nb: AiTranslations = {
  'ai.error.noProvider': 'AI-leverandør er ikke konfigurert. Koble til en AI-leverandør først.',
  'ai.error.ambiguousProvider':
    'Flere navngitte AI-leverandører er tilkoblet, og ingen standard er angitt. Bruk getProviderByName(name) for å velge en.',
  'ai.error.responseIncomplete': 'AI-svaret ble avsluttet før fullføring. Prøv på nytt.',
  'ai.error.responseTokenLimit': 'AI-responsen nådde grensen for utdatatoken før fullføring.',
  'ai.error.apiError': 'Feil med AI-tjenesten. Prøv på nytt.',
  'ai.error.noResponseBody': 'Ingen respons fra AI-tjenesten.',
}
