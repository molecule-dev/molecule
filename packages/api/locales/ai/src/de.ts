import type { AiTranslations } from './types.js'

/** Ai translations for German. */
export const de: AiTranslations = {
  'ai.error.noProvider': 'KI-Anbieter nicht konfiguriert. Binden Sie zuerst einen KI-Anbieter.',
  'ai.error.apiError': 'KI-API-Anfrage fehlgeschlagen.',
  'ai.error.noResponseBody': 'Der KI-Antworttext ist leer.',
  'ai.error.ambiguousProvider':
    'Mehrere benannte KI-Anbieter sind gebunden und es wurde kein Standard festgelegt. Verwenden Sie getProviderByName(name), um einen auszuwählen.',
}
