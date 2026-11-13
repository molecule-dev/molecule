import type { AiTranslations } from './types.js'

/** Ai translations for German. */
export const de: AiTranslations = {
  'ai.error.noProvider': 'KI-Anbieter nicht konfiguriert. Binden Sie zuerst einen KI-Anbieter.',
  'ai.error.ambiguousProvider':
    'Mehrere benannte KI-Anbieter sind gebunden und es wurde kein Standard festgelegt. Verwenden Sie getProviderByName(name), um einen auszuwählen.',
  'ai.error.responseIncomplete':
    'Die KI-Antwort wurde vorzeitig abgebrochen. Bitte versuchen Sie es erneut.',
  'ai.error.responseTokenLimit': 'Die KI-Antwort erreichte das Ausgabetoken-Limit vor Abschluss.',
  'ai.error.apiError': 'Fehler im KI-Dienst. Bitte versuchen Sie es erneut.',
  'ai.error.noResponseBody': 'Keine Antwort vom KI-Dienst.',
}
