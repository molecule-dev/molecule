import type { AiTranslations } from './types.js'

/** Ai translations for Norwegian Bokmål. */
export const nb: AiTranslations = {
  'ai.error.noProvider': 'AI-leverandør er ikke konfigurert. Koble til en AI-leverandør først.',
  'ai.error.apiError': 'AI API-forespørsel mislyktes.',
  'ai.error.noResponseBody': 'AI-svarkroppen er tom.',
  'ai.error.ambiguousProvider':
    'Flere navngitte AI-leverandører er tilkoblet, og ingen standard er angitt. Bruk getProviderByName(name) for å velge en.',
}
