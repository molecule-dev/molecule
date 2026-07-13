import type { AiTranslations } from './types.js'

/** Ai translations for Danish. */
export const da: AiTranslations = {
  'ai.error.noProvider': 'AI-udbyder er ikke konfigureret. Tilknyt en AI-udbyder først.',
  'ai.error.apiError': 'AI API-anmodning mislykkedes.',
  'ai.error.noResponseBody': 'AI-svarlegemet er tomt.',
  'ai.error.ambiguousProvider':
    'Flere navngivne AI-udbydere er tilknyttet, og der er ikke angivet nogen standard. Brug getProviderByName(name) til at vælge en.',
}
