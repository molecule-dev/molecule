import type { AiTranslations } from './types.js'

/** Ai translations for Danish. */
export const da: AiTranslations = {
  'ai.error.noProvider': 'AI-udbyder er ikke konfigureret. Tilknyt en AI-udbyder først.',
  'ai.error.ambiguousProvider':
    'Flere navngivne AI-udbydere er tilknyttet, og der er ikke angivet nogen standard. Brug getProviderByName(name) til at vælge en.',
  'ai.error.responseIncomplete': 'AI-svaret blev afsluttet før færdiggørelse. Prøv igen.',
  'ai.error.responseTokenLimit': 'AI-svaret nåede outputtokengrænsen før færdiggørelse.',
  'ai.error.apiError': 'Fejl i AI-tjenesten. Prøv igen.',
  'ai.error.noResponseBody': 'Intet svar fra AI-tjenesten.',
}
