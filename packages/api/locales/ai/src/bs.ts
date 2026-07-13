import type { AiTranslations } from './types.js'

/** Ai translations for Bosnian. */
export const bs: AiTranslations = {
  'ai.error.noProvider': 'AI provajder nije konfigurisan. Prvo povežite AI provajdera.',
  'ai.error.apiError': 'AI API zahtjev nije uspio.',
  'ai.error.noResponseBody': 'Tijelo AI odgovora je prazno.',
  'ai.error.ambiguousProvider':
    'Povezano je više imenovanih AI provajdera i nije postavljen podrazumijevani. Koristite getProviderByName(name) da odaberete jednog.',
}
