import type { AiTranslations } from './types.js'

/** Ai translations for Slovenian. */
export const sl: AiTranslations = {
  'ai.error.noProvider': 'Ponudnik AI ni konfiguriran. Najprej povežite ponudnika AI.',
  'ai.error.ambiguousProvider':
    'Povezanih je več poimenovanih ponudnikov AI in privzeti ni nastavljen. Uporabite getProviderByName(name), da izberete enega.',
  'ai.error.responseIncomplete':
    'Odziv umetne inteligence se je končal pred dokončanjem. Poskusite znova.',
  'ai.error.responseTokenLimit':
    'Odgovor umetne inteligence je dosegel omejitev izhodnih žetonov pred zaključkom.',
  'ai.error.apiError': 'Napaka storitve umetne inteligence. Poskusite znova.',
  'ai.error.noResponseBody': 'Storitev umetne inteligence se ni odzvala.',
}
