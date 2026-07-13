import type { AiTranslations } from './types.js'

/** Ai translations for Slovenian. */
export const sl: AiTranslations = {
  'ai.error.noProvider': 'Ponudnik AI ni konfiguriran. Najprej povežite ponudnika AI.',
  'ai.error.apiError': 'Zahteva AI API ni uspela.',
  'ai.error.noResponseBody': 'Telo odgovora AI je prazno.',
  'ai.error.ambiguousProvider':
    'Povezanih je več poimenovanih ponudnikov AI in privzeti ni nastavljen. Uporabite getProviderByName(name), da izberete enega.',
}
